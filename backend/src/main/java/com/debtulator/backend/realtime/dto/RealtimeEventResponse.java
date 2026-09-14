package com.debtulator.backend.realtime.dto;

import com.debtulator.backend.realtime.StoredRealtimeEvent;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record RealtimeEventResponse(
        String sequence,
        UUID id,
        String type,
        Map<String, Object> payload,
        Instant occurredAt
) {
    public static RealtimeEventResponse from(StoredRealtimeEvent event) {
        return new RealtimeEventResponse(
                Long.toString(event.sequence()),
                event.id(),
                event.type(),
                event.payload(),
                event.occurredAt()
        );
    }
}
