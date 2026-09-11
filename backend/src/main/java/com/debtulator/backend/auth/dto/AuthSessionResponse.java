package com.debtulator.backend.auth.dto;

public record AuthSessionResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        Long expiresAt,
        String tokenType,
        AuthUserResponse user
) {
}
