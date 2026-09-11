package com.debtulator.backend.profiles.dto;
import java.time.Instant;
import java.util.UUID;
public record ProfileResponse(UUID userId, String name, String baseCurrency, Instant createdAt, Instant updatedAt) {}
