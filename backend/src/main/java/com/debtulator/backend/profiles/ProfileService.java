package com.debtulator.backend.profiles;

import com.debtulator.backend.currencies.Currency;
import com.debtulator.backend.currencies.CurrencyService;
import com.debtulator.backend.currencies.CurrencyServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final CurrencyService currencyService;
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
        Currency currency = requireCurrencyForUpdate(
                profile.getBaseCurrency(),
                baseCurrency
        );

        profile.update(
                normalizedDisplayName,
                currency.getCode(),
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

    private Currency requireCurrencyForUpdate(
            String currentCode,
            String requestedCode
    ) {
        try {
            Currency currency = currencyService.require(requestedCode);

            if (!currency.getCode().equals(currentCode)
                    && !currency.isEnabled()) {
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
