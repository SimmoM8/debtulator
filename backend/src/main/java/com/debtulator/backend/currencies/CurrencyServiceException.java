package com.debtulator.backend.currencies;

import lombok.Getter;

@Getter
public class CurrencyServiceException extends RuntimeException {

    private final Reason reason;

    public CurrencyServiceException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public enum Reason {
        INVALID_CODE,
        NOT_FOUND,
        DISABLED
    }
}
