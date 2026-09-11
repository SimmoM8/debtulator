package com.debtulator.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Size(min = 8, max = 128) String newPassword,
        @Size(max = 128) String currentPassword,
        @Size(max = 64) String nonce
) {
}
