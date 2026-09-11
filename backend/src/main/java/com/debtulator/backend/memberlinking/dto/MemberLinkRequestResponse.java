package com.debtulator.backend.memberlinking.dto;

import java.time.Instant;
import java.util.UUID;

public record MemberLinkRequestResponse(
        UUID id,
        String direction,
        String status,
        UUID userId,
        String displayName,
        UUID memberId,
        Instant createdAt,
        Instant resolvedAt,
        Instant unlinkedAt
) {
}
