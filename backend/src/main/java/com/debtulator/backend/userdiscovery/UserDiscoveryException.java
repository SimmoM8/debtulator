package com.debtulator.backend.userdiscovery;

import lombok.Getter;

@Getter
public class UserDiscoveryException extends RuntimeException {

    public enum Reason {
        INVALID_QUERY,
        RATE_LIMITED
    }

    private final Reason reason;

    private final Long retryAfterSeconds;

    public UserDiscoveryException(
            Reason reason,
            String message) {
        this(reason, message, null);
    }

    public UserDiscoveryException(
            Reason reason,
            String message,
            Long retryAfterSeconds) {
        super(message);
        this.reason = reason;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
