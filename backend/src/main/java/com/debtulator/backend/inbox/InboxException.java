package com.debtulator.backend.inbox;

import lombok.Getter;

@Getter
public class InboxException extends RuntimeException {

    private final Reason reason;

    public InboxException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public enum Reason {
        INVALID_SCOPE,
        INVALID_TYPE,
        INVALID_LIMIT
    }
}
