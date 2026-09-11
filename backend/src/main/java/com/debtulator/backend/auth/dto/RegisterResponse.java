package com.debtulator.backend.auth.dto;

public record RegisterResponse(
        boolean emailVerificationRequired,
        AuthSessionResponse session
) {
}
