package com.debtulator.backend.inbox.dto;

import java.time.Instant;
import java.util.UUID;

public record InboxRequestResponse(
        UUID requestId,
        String type,
        String action,
        String direction,
        String status,
        UUID counterpartyUserId,
        String counterpartyName,
        Instant createdAt,
        Instant updatedAt
) {
    public InboxRequestResponse(
            UUID requestId,
            String type,
            String direction,
            String status,
            UUID counterpartyUserId,
            String counterpartyName,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(
                requestId,
                type,
                null,
                direction,
                status,
                counterpartyUserId,
                counterpartyName,
                createdAt,
                updatedAt
        );
    }
}
