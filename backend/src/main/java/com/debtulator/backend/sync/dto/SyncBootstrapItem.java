package com.debtulator.backend.sync.dto;

import java.util.Map;
import java.util.UUID;

public record SyncBootstrapItem(
        UUID entityId,
        Long version,
        Map<String, Object> payload
) {
}

