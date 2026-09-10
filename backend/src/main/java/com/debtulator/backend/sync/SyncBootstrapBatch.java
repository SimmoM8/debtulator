package com.debtulator.backend.sync;

import com.debtulator.backend.sync.dto.SyncBootstrapItem;

import java.util.List;
import java.util.UUID;

public record SyncBootstrapBatch(
        List<SyncBootstrapItem> items,
        UUID nextAfterId,
        boolean hasMore
) {
}
