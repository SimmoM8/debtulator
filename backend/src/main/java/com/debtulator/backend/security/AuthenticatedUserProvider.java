package com.debtulator.backend.security;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AuthenticatedUserProvider {

    public AuthenticatedUser from(Jwt jwt) {
        return new AuthenticatedUser(UUID.fromString(jwt.getSubject()));
    }
}
