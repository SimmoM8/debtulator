package com.debtulator.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UuidSubjectValidatorTest {

    private final UuidSubjectValidator validator =
            new UuidSubjectValidator();

    @Test
    void acceptsUuidSubject() {
        var result = validator.validate(jwt(UUID.randomUUID().toString()));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void rejectsMalformedSubject() {
        var result = validator.validate(jwt("not-a-uuid"));

        assertThat(result.hasErrors()).isTrue();
    }

    private Jwt jwt(String subject) {
        Instant now = Instant.now();

        return Jwt.withTokenValue("token")
                .header("alg", "ES256")
                .subject(subject)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60))
                .build();
    }
}
