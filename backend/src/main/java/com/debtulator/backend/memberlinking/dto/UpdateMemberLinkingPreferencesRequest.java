package com.debtulator.backend.memberlinking.dto;

public record UpdateMemberLinkingPreferencesRequest(
        boolean incomingMemberLinkRequestsEnabled
) {
}
