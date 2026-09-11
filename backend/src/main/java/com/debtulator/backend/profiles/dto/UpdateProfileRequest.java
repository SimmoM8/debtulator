package com.debtulator.backend.profiles.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateProfileRequest(
        String displayName,

        @NotBlank
        @Pattern(
                regexp = "(?i)^[a-z]{3}$",
                message = "baseCurrency must be a 3-letter currency code."
        )
        String baseCurrency
) {
}
