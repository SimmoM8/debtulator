package com.debtulator.backend.auth.supabase;

public record SupabaseSession(
        String accessToken,
        String refreshToken,
        long expiresIn,
        Long expiresAt,
        String tokenType,
        SupabaseUser user
) {
}
