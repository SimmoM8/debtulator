package com.debtulator.backend.memberlinking;

import lombok.Getter;

@Getter
public class MemberLinkingException extends RuntimeException {
    private final Reason reason;
    public MemberLinkingException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public enum Reason {
        SELF_LINK,
        REQUESTER_PROFILE_INCOMPLETE,
        TARGET_NOT_AVAILABLE,
        TARGET_PROFILE_INCOMPLETE,
        TARGET_NOT_ACCEPTING_REQUESTS,
        INVALID_NAME_SELECTION,
        MEMBER_NOT_AVAILABLE,
        MEMBER_ALREADY_LINKED,
        MEMBER_ALREADY_PENDING,
        RELATIONSHIP_ALREADY_EXISTS,
        REQUEST_ALREADY_PENDING,
        REQUEST_ID_REUSED,
        REQUEST_NOT_FOUND,
        REQUEST_NOT_PENDING,
        LINK_NOT_FOUND
    }
}
