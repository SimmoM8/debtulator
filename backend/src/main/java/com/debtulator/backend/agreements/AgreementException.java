package com.debtulator.backend.agreements;

import lombok.Getter;

@Getter
public class AgreementException extends RuntimeException {
    private final Reason reason;

    public AgreementException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public enum Reason {
        REQUEST_NOT_FOUND,
        REQUEST_NOT_PENDING,
        STALE_PROPOSAL,
        RELATIONSHIP_ENDED
    }
}
