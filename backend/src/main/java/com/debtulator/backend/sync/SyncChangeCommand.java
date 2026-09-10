package com.debtulator.backend.sync;

import java.util.Map;
import java.util.UUID;

public record SyncChangeCommand(
        SyncEntityType entityType,
        UUID entityId,
        SyncOperation operation,
        Map<String, Object> payload
) {
}
