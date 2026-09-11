package com.debtulator.backend.auth.supabase;

import lombok.Getter;

@Getter
public class SupabaseAuthException extends RuntimeException {

    private final int statusCode;
    private final String errorCode;

    public SupabaseAuthException(
            int statusCode,
            String errorCode,
            String message
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}
