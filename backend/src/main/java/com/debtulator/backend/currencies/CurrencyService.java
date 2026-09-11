package com.debtulator.backend.currencies;

import lombok.RequiredArgsConstructor;
import org.joda.money.CurrencyUnit;
import org.joda.money.IllegalCurrencyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(
        readOnly = true,
        noRollbackFor = CurrencyServiceException.class
)
public class CurrencyService {

    private final CurrencyRepository currencyRepository;

    public List<Currency> getEnabledCurrencies() {
        List<Currency> currencies =
                currencyRepository.findAllByEnabledTrueOrderByDisplayOrderAscCodeAsc();

        currencies.forEach(this::validateConfiguration);
        return currencies;
    }

    public Currency require(String code) {
        String normalizedCode = normalizeCode(code);

        Currency currency = currencyRepository
                .findById(normalizedCode)
                .orElseThrow(() -> new CurrencyServiceException(
                        CurrencyServiceException.Reason.NOT_FOUND,
                        "Currency '" + normalizedCode + "' is not configured."
                ));

        validateConfiguration(currency);
        return currency;
    }

    public Currency requireEnabled(String code) {
        Currency currency = require(code);

        if (!currency.isEnabled()) {
            throw new CurrencyServiceException(
                    CurrencyServiceException.Reason.DISABLED,
                    "Currency '" + currency.getCode()
                            + "' is not currently available for new operations."
            );
        }

        return currency;
    }

    private String normalizeCode(String code) {
        String normalized = code == null
                ? ""
                : code.trim().toUpperCase(Locale.ROOT);

        if (!normalized.matches("^[A-Z]{3}$")) {
            throw new CurrencyServiceException(
                    CurrencyServiceException.Reason.INVALID_CODE,
                    "Currency code must contain exactly three letters."
            );
        }

        return normalized;
    }

    private void validateConfiguration(Currency currency) {
        try {
            CurrencyUnit.of(currency.getCode());
        } catch (IllegalCurrencyException exception) {
            throw new IllegalStateException(
                    "Configured currency '" + currency.getCode()
                            + "' is not recognized by Joda-Money.",
                    exception
            );
        }

        if (currency.getDecimalPlaces() < 0
                || currency.getDecimalPlaces() > 8) {
            throw new IllegalStateException(
                    "Configured currency '" + currency.getCode()
                            + "' has unsupported decimalPlaces="
                            + currency.getDecimalPlaces() + "."
            );
        }
    }
}
