package com.debtulator.backend.sync.dto;

import java.util.List;
import java.util.UUID;

public record SyncBootstrapPageResponse(
        String entityType,
        List<SyncBootstrapItem> items,
        UUID nextAfterId,
        boolean hasMore
) {
}
