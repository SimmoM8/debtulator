package com.debtulator.backend.sync.dto;

import com.debtulator.backend.sync.SyncChange;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SyncChangeResponse(
        String sequence,
        String entityType,
        UUID entityId,
        String operation,
        Map<String, Object> payload,
        Instant changedAt
) {

    public static SyncChangeResponse from(SyncChange change) {
        return new SyncChangeResponse(
                change.getSequence().toString(),
                change.getEntityType(),
                change.getEntityId(),
                change.getOperation(),
                change.getPayload(),
                change.getChangedAt()
        );
    }
}

