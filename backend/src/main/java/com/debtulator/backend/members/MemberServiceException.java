package com.debtulator.backend.members;

import lombok.Getter;

@Getter
public class MemberServiceException extends RuntimeException {
    private final Reason reason;
    private final Long currentVersion;

    public MemberServiceException(Reason reason, Long currentVersion, String message) {
        super(message);
        this.reason = reason;
        this.currentVersion = currentVersion;
    }

    public enum Reason {
        INVALID_DISPLAY_NAME,
        ALREADY_EXISTS,
        NOT_FOUND,
        DELETED,
        VERSION_CONFLICT,
        LINKED,
        LINK_PENDING,
        IN_USE
    }
}
