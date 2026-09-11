package com.debtulator.backend.agreements.dto;

import java.time.Instant;
import java.util.UUID;

public record AgreementStateResponse(
        String entityType,
        UUID entityId,
        long entityVersion,
        String status,
        UUID latestRequestId,
        Instant updatedAt
) {}
