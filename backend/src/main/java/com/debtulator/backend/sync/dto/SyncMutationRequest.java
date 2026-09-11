package com.debtulator.backend.sync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.Map;
import java.util.UUID;

public record SyncMutationRequest(
        @NotNull UUID id,
        @NotBlank String entityType,
        @NotNull UUID entityId,
        @NotBlank String operation,
        @PositiveOrZero Long baseVersion,
        Map<String, Object> payload
) {
}

