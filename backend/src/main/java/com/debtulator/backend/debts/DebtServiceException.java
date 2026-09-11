package com.debtulator.backend.debts;

import lombok.Getter;

@Getter
public class DebtServiceException extends RuntimeException {

    private final Reason reason;
    private final Long currentVersion;

    public DebtServiceException(
            Reason reason,
            Long currentVersion,
            String message
    ) {
        super(message);
        this.reason = reason;
        this.currentVersion = currentVersion;
    }

    public enum Reason {
        INVALID_DIRECTION,
        INVALID_AMOUNT,
        INVALID_TITLE,
        MEMBER_NOT_FOUND,
        CURRENCY_NOT_SUPPORTED,
        ALREADY_EXISTS,
        NOT_FOUND,
        DELETED,
        VERSION_CONFLICT
    }
}
