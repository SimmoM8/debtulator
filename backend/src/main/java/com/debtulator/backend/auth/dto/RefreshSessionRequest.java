package com.debtulator.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefreshSessionRequest(
        @NotBlank @Size(max = 8192) String refreshToken
) {
}
