package com.debtulator.backend.sync.dto;

import java.util.List;

public record PullSyncResponse(
        List<SyncChangeResponse> changes,
        String nextCursor,
        boolean hasMore
) {
}

