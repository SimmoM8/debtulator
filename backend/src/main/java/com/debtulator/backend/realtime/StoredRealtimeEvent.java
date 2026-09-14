package com.debtulator.backend.realtime;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record StoredRealtimeEvent(
        long sequence,
        UUID id,
        UUID recipientUserId,
        String type,
        Map<String, Object> payload,
        Instant occurredAt
) {
}
