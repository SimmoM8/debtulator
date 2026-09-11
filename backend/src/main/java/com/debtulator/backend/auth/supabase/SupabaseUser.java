package com.debtulator.backend.auth.supabase;

import java.util.UUID;

public record SupabaseUser(
        UUID id,
        String email,
        boolean emailConfirmed
) {
}
