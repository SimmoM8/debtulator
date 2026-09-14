package com.debtulator.backend.realtime;

import java.util.UUID;

public record RealtimeConnectionTicket(
        UUID userId,
        long resumeAfterSequence
) {
}
