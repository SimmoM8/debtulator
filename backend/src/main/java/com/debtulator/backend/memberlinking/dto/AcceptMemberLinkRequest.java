package com.debtulator.backend.memberlinking.dto;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AcceptMemberLinkRequest(
        UUID memberId,
        @Size(max = 120) String displayName,
        boolean useRequesterFullName
) {
}
