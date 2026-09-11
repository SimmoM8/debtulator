package com.debtulator.backend.sync.dto;

import com.debtulator.backend.sync.SyncLimits;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PushSyncRequest(
        @NotEmpty
        @Size(max = SyncLimits.MAX_PUSH_BATCH_SIZE)
        List<@NotNull @Valid SyncMutationRequest> mutations
) {
}

