package com.debtulator.backend.currencies;

import com.debtulator.backend.currencies.dto.CurrencyResponse;
import org.springframework.stereotype.Component;

@Component
public class CurrencyMapper {

    public CurrencyResponse toResponse(Currency currency) {
        return new CurrencyResponse(
                currency.getCode(),
                currency.getName(),
                currency.getSymbol(),
                currency.getDecimalPlaces(),
                currency.getDisplayOrder()
        );
    }
}
