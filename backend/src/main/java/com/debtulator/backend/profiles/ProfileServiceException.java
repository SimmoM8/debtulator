package com.debtulator.backend.profiles;

import lombok.Getter;

@Getter
public class ProfileServiceException extends RuntimeException {
    private final Reason reason;

    public ProfileServiceException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public enum Reason {
        NOT_FOUND,
        INVALID_NAME,
        CURRENCY_NOT_SUPPORTED
    }
}
