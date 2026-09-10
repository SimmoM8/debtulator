package com.debtulator.backend.sync;

import java.util.Map;
import java.util.UUID;

public record SyncMutationCommand(
        UUID id,
        SyncEntityType entityType,
        UUID entityId,
        SyncOperation operation,
        Long baseVersion,
        Map<String, Object> payload
) {
}
