package com.debtulator.backend.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UuidSubjectValidator implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        try {
            UUID.fromString(jwt.getSubject());
            return OAuth2TokenValidatorResult.success();
        } catch (RuntimeException exception) {
            OAuth2Error error = new OAuth2Error(
                    "invalid_token",
                    "The token subject is invalid.",
                    null
            );
            return OAuth2TokenValidatorResult.failure(error);
        }
    }
}
