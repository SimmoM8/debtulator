package com.debtulator.backend.realtime.dto;

import jakarta.validation.constraints.Min;

public record CreateRealtimeConnectionTicketRequest(
        @Min(0) Long afterSequence
) {
}
