package com.debtulator.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
        @NotBlank @Size(max = 4096) String tokenHash,
        @NotBlank @Size(min = 8, max = 128) String newPassword
) {
}
