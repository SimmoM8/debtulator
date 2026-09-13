package com.debtulator.backend.profiles.dto;

import java.time.Instant;
import java.util.UUID;

public record ProfileResponse(
        UUID userId,
        String username,
        String name,
        String phoneNumber,
        String baseCurrency,
        Instant createdAt,
        Instant updatedAt
) {
}
