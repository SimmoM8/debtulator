package com.debtulator.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailConfirmationRequest(
        @NotBlank @Size(max = 4096) String tokenHash
) {
}
