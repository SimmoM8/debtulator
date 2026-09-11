package com.debtulator.backend.agreements;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AgreementRequest(
        UUID id,
        UUID requesterUserId,
        UUID targetUserId,
        String entityType,
        UUID entityId,
        long entityVersion,
        String action,
        Map<String, Object> payload,
        String status,
        Instant createdAt,
        Instant resolvedAt
) {
    public boolean isPending() { return "pending".equals(status); }
    public boolean isAccepted() { return "accepted".equals(status); }
    public boolean isRejected() { return "rejected".equals(status); }
    public boolean isCancelled() { return "cancelled".equals(status); }
}
