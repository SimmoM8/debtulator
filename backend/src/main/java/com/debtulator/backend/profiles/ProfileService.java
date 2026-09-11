package com.debtulator.backend.profiles;

import com.debtulator.backend.currencies.CurrencyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final CurrencyRepository currencyRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Profile get(UUID userId) {
        return profileRepository
                .findById(userId)
                .orElseThrow(() -> new ProfileServiceException(
                        ProfileServiceException.Reason.NOT_FOUND,
                        "The profile does not exist."
                ));
    }

    @Transactional
    public Profile update(
            UUID userId,
            String displayName,
            String baseCurrency
    ) {
        Profile profile = profileRepository
                .findForUpdate(userId)
                .orElseThrow(() -> new ProfileServiceException(
                        ProfileServiceException.Reason.NOT_FOUND,
                        "The profile does not exist."
                ));

        String normalizedDisplayName = normalizeDisplayName(displayName);
        String normalizedCurrency = normalizeCurrency(baseCurrency);

        if (!currencyRepository.existsById(normalizedCurrency)) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.CURRENCY_NOT_SUPPORTED,
                    "The selected base currency is not supported."
            );
        }

        profile.update(
                normalizedDisplayName,
                normalizedCurrency,
                Instant.now(clock)
        );

        profileRepository.flush();

        return profile;
    }

    private String normalizeDisplayName(String displayName) {
        if (displayName == null) {
            return null;
        }

        String normalized = displayName.trim();

        if (normalized.isEmpty()) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_DISPLAY_NAME,
                    "displayName must not be blank."
            );
        }

        if (normalized.codePointCount(0, normalized.length()) > 120) {
            throw new ProfileServiceException(
                    ProfileServiceException.Reason.INVALID_DISPLAY_NAME,
                    "displayName must not exceed 120 characters."
            );
        }

        return normalized;
    }

    private String normalizeCurrency(String baseCurrency) {
        return baseCurrency == null
                ? ""
                : baseCurrency.trim().toUpperCase(Locale.ROOT);
    }
}
