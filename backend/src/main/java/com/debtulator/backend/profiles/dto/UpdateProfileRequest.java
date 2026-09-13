package com.debtulator.backend.profiles.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 40) String username,
        @Size(max = 120) String name,
        @Size(max = 32) String phoneNumber,
        @NotBlank @Pattern(
                regexp = "(?i)^[a-z]{3}$",
                message = "baseCurrency must be a 3-letter currency code."
        ) String baseCurrency
) {
}
