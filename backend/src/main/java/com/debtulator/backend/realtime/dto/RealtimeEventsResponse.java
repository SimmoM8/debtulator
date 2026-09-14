package com.debtulator.backend.realtime.dto;

import java.util.List;

public record RealtimeEventsResponse(
        List<RealtimeEventResponse> events,
        String nextSequence,
        boolean hasMore
) {
}
