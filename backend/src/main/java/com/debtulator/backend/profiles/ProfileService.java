package com.debtulator.backend.profiles;

import com.debtulator.backend.currencies.Currency;
import com.debtulator.backend.currencies.CurrencyService;
import com.debtulator.backend.currencies.CurrencyServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private static final Duration REGISTRATION_RESERVATION_TTL = Duration.ofMinutes(15);
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9_]{3,40}$");
    private static final Pattern E164_PHONE_PATTERN = Pattern.compile("^\\+[1-9][0-9]{7,14}$");

    private final ProfileRepository profileRepository;
    private final CurrencyService currencyService;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Profile get(UUID userId) {
        return profileRepository.findById(userId)
                .orElseThrow(() -> new ProfileServiceException(
                        ProfileServiceException.Reason.NOT_FOUND,
                        "The profile does not exist."
                ));
    }

    @Transactional
    public Profile update(
            UUID userId,
            String username,
            String name,
            String phoneNumber,
            String baseCurrency
    ) {
        Profile profile = requireForUpdate(userId);

        String normalizedUsername = username == null
                ? profile.getUsername()
                : normalizeUsername(username);
        String normalizedName = name == null
                ? profile.getName()
                : normalizeName(name, true);
        String normalizedPhoneNumber = phoneNumber == null
                ? profile.getPhoneNumber()
                : normalizePhoneNumber(phoneNumber);
        Currency currency = requireCurrencyForUpdate(profile.getBaseCurrency(), baseCurrency);

        if (!normalizedUsername.equals(profile.getUsername())) {
            lockUsername(normalizedUsername);

            if (isUsernameUnavailable(normalizedUsername, userId, Instant.now(clock))) {
                throw new ProfileServiceException(
                        ProfileServiceException.Reason.USERNAME_TAKEN,
                        "That username is already in use."
                );
            }
        }

        profile.update(
                normalizedUsername,
                normalizedName,
                normalizedPhoneNumber,
                currency.getCode(),
                Instant.now(clock)
        );
        profileRepository.flush();
        return profile;
    }

    @Transactional
    public Profile updateDiscoveryPreferences(
            UUID userId,
            boolean memberDiscoveryEnabled,
            boolean discoverableByUsername,
            boolean discoverableByName,
            boolean discoverableByEmail,
            boolean discoverableByPhone
    ) {
        Profile profile = requireForUpdate(userId);
        profile.updateDiscoveryPreferences(
                memberDiscoveryEnabled,
                discoverableByUsername,
                discoverableByName,
                discoverableByEmail,
                discoverableByPhone,
                Instant.now(clock)
        );
        profileRepository.flush();
        return profile;
    }

    @Transactional
    public Profile updateIncomingMemberLinkRequestsEnabled(UUID userId, boolean enabled) {
        Profile profile = requireForUpdate(userId);
        profile.updateIncomingMemberLinkRequestsEnabled(enabled, Instant.now(clock));
        profileRepository.flush();
        return profile;
    }

    /**
     * Reserves the app-profile fields before the Supabase Auth signup call.
     * The auth.users trigger consumes this row atomically when the provider
     * creates the user, allowing the profile to be complete even when email
     * confirmation is required and no authenticated session is returned yet.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reserveRegistrationProfile(
            String email,
            String name,
            String username,
            String phoneNumber,
            String baseCurrency
    ) {
        Instant now = Instant.now(clock);
        String normalizedEmail = normalizeEmail(email);
        String normalizedName = normalizeName(name, true);
        String normalizedUsername = normalizeUsername(username);
        String normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        Currency currency = requireEnabledCurrency(baseCurrency);

        jdbcTemplate.update(
                "DELETE FROM public.pending_account_registrations WHERE expires_at <= ?",
                Timestamp.from(now)
        );

        lockUsername(normalizedUsername);

        if (isUsernameUnavailableForRegistration(normalizedUsername, normalizedEmail, now)) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.USERNAME_TAKEN,
                    "That username is already in use."
            );
        }

        Instant expiresAt = now.plus(REGISTRATION_RESERVATION_TTL);

        try {
            int changes = jdbcTemplate.update(
                    """
                    INSERT INTO public.pending_account_registrations (
                        normalized_email,
                        username,
                        name,
                        phone_number,
                        base_currency,
                        created_at,
                        expires_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (normalized_email) DO UPDATE SET
                        name = excluded.name,
                        phone_number = excluded.phone_number,
                        base_currency = excluded.base_currency,
                        created_at = excluded.created_at,
                        expires_at = excluded.expires_at
                    WHERE public.pending_account_registrations.username = excluded.username
                    """,
                    normalizedEmail,
                    normalizedUsername,
                    normalizedName,
                    normalizedPhoneNumber,
                    currency.getCode(),
                    Timestamp.from(now),
                    Timestamp.from(expiresAt)
            );

            if (changes == 0) {
                throw new ProfileServiceException(
                        ProfileServiceException.Reason.REGISTRATION_PENDING,
                        "A registration is already in progress for this email address with a different username."
                );
            }
        } catch (DataIntegrityViolationException exception) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.USERNAME_TAKEN,
                    "That username is already in use."
            );
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void releaseRegistrationProfile(String email) {
        jdbcTemplate.update(
                "DELETE FROM public.pending_account_registrations WHERE normalized_email = ?",
                normalizeEmail(email)
        );
    }

    private Profile requireForUpdate(UUID userId) {
        return profileRepository.findForUpdate(userId)
                .orElseThrow(() -> new ProfileServiceException(
                        ProfileServiceException.Reason.NOT_FOUND,
                        "The profile does not exist."
                ));
    }

    private boolean isUsernameUnavailableForRegistration(
            String username,
            String normalizedEmail,
            Instant now
    ) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM public.profiles
                    WHERE lower(username) = ?

                    UNION ALL

                    SELECT 1
                    FROM public.pending_account_registrations
                    WHERE username = ?
                      AND normalized_email <> ?
                      AND expires_at > ?
                )
                """,
                Boolean.class,
                username,
                username,
                normalizedEmail,
                Timestamp.from(now)
        );

        return Boolean.TRUE.equals(exists);
    }

    private boolean isUsernameUnavailable(
            String username,
            UUID excludedUserId,
            Instant now
    ) {
        Boolean exists = excludedUserId == null
                ? jdbcTemplate.queryForObject(
                        """
                        SELECT EXISTS (
                            SELECT 1
                            FROM public.profiles
                            WHERE lower(username) = ?

                            UNION ALL

                            SELECT 1
                            FROM public.pending_account_registrations
                            WHERE username = ?
                              AND expires_at > ?
                        )
                        """,
                        Boolean.class,
                        username,
                        username,
                        Timestamp.from(now)
                )
                : jdbcTemplate.queryForObject(
                        """
                        SELECT EXISTS (
                            SELECT 1
                            FROM public.profiles
                            WHERE lower(username) = ?
                              AND user_id <> ?

                            UNION ALL

                            SELECT 1
                            FROM public.pending_account_registrations
                            WHERE username = ?
                              AND expires_at > ?
                        )
                        """,
                        Boolean.class,
                        username,
                        excludedUserId,
                        username,
                        Timestamp.from(now)
                );

        return Boolean.TRUE.equals(exists);
    }

    private void lockUsername(String username) {
        jdbcTemplate.query(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                statement -> statement.setString(1, "profile-username:" + username),
                resultSet -> null
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUsername(String username) {
        String normalized = username == null
                ? ""
                : username.trim().toLowerCase(Locale.ROOT);

        if (!USERNAME_PATTERN.matcher(normalized).matches()) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_USERNAME,
                    "username must contain 3 to 40 lowercase letters, numbers, or underscores."
            );
        }

        return normalized;
    }

    private String normalizeName(String name, boolean required) {
        if (name == null) {
            if (!required) {
                return null;
            }
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_NAME,
                    "name must not be blank."
            );
        }

        String normalized = name.trim();
        if (normalized.isEmpty()) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_NAME,
                    "name must not be blank."
            );
        }
        if (normalized.codePointCount(0, normalized.length()) > 120) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_NAME,
                    "name must not exceed 120 characters."
            );
        }
        return normalized;
    }

    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }

        String normalized = phoneNumber.trim();
        if (normalized.isEmpty()) {
            return null;
        }

        if (!E164_PHONE_PATTERN.matcher(normalized).matches()) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_PHONE,
                    "phoneNumber must use E.164 format, for example +46701234567."
            );
        }

        return normalized;
    }

    private Currency requireEnabledCurrency(String requestedCode) {
        try {
            Currency currency = currencyService.require(requestedCode);
            if (!currency.isEnabled()) {
                throw new CurrencyServiceException(
                        CurrencyServiceException.Reason.DISABLED,
                        "The selected base currency is disabled."
                );
            }
            return currency;
        } catch (CurrencyServiceException exception) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.CURRENCY_NOT_SUPPORTED,
                    "The selected base currency is not supported."
            );
        }
    }

    private Currency requireCurrencyForUpdate(String currentCode, String requestedCode) {
        try {
            Currency currency = currencyService.require(requestedCode);
            if (!currency.getCode().equals(currentCode) && !currency.isEnabled()) {
                throw new CurrencyServiceException(
                        CurrencyServiceException.Reason.DISABLED,
                        "The selected base currency is disabled."
                );
            }
            return currency;
        } catch (CurrencyServiceException exception) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.CURRENCY_NOT_SUPPORTED,
                    "The selected base currency is not supported."
            );
        }
    }
}
