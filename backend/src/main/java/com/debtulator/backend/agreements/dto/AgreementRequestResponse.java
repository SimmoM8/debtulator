package com.debtulator.backend.agreements.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AgreementRequestResponse(
        UUID id,
        String direction,
        UUID userId,
        String entityType,
        UUID entityId,
        long entityVersion,
        String action,
        Map<String, Object> payload,
        String status,
        Instant createdAt,
        Instant resolvedAt
) {}
