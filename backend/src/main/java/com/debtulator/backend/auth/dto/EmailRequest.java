package com.debtulator.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @Size(max = 4096) String captchaToken
) {
}
