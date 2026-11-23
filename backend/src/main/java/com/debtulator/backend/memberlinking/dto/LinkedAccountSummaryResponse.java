package com.debtulator.backend.memberlinking.dto;

import java.util.UUID;

/** Only account information authorized through an active member link. */
public record LinkedAccountSummaryResponse(UUID linkedUserId, String username) {
}
