package com.debtulator.backend.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "debtulator.security.jwt")
public record JwtProperties(
        String issuer,
        String jwkSetUri,
        String audience
) {
}
