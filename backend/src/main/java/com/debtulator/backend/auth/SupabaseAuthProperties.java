package com.debtulator.backend.auth;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "debtulator.auth.supabase")
public record SupabaseAuthProperties(
        @NotBlank String baseUrl,
        @NotBlank String apiKey,
        @NotBlank String signupRedirectUrl,
        @NotBlank String recoveryRedirectUrl,
        boolean forwardClientIp
) {
}
