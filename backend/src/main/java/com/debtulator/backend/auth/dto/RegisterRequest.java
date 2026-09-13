package com.debtulator.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(min = 3, max = 40) String username,
        @Size(max = 32) String phoneNumber,
        @NotBlank @Pattern(
                regexp = "(?i)^[a-z]{3}$",
                message = "baseCurrency must be a 3-letter currency code."
        ) String baseCurrency,
        @Size(max = 4096) String captchaToken
) {
}
