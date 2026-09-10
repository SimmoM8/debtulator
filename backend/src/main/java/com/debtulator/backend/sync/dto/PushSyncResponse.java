package com.debtulator.backend.sync.dto;

import java.util.List;

public record PushSyncResponse(
        List<SyncMutationResult> results
) {
}
