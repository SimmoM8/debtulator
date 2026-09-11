package com.debtulator.backend.auth.dto;

import java.util.UUID;

public record AuthUserResponse(
        UUID id,
        String email,
        boolean emailConfirmed
) {
}
