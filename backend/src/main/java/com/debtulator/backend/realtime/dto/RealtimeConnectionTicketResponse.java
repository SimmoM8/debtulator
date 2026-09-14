package com.debtulator.backend.realtime.dto;

import java.time.Instant;
import java.util.UUID;

public record RealtimeConnectionTicketResponse(
        UUID ticket,
        Instant expiresAt
) {
}
