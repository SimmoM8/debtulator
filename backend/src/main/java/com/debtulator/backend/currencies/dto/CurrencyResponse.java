package com.debtulator.backend.currencies.dto;

public record CurrencyResponse(
        String code,
        String name,
        String symbol,
        short decimalPlaces,
        int displayOrder
) {
}
