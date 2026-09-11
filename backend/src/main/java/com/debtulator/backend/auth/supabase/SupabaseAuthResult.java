package com.debtulator.backend.auth.supabase;

public record SupabaseAuthResult(
        SupabaseUser user,
        SupabaseSession session
) {
}
