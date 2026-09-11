package com.debtulator.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.BearerTokenErrorCodes;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    private final BearerTokenAuthenticationEntryPoint delegate =
            new BearerTokenAuthenticationEntryPoint();

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        delegate.commence(request, response, exception);

        AuthenticationFailure failure = classify(exception);
        HttpStatus status = HttpStatus.valueOf(response.getStatus());

        log.debug(
                "Authentication failed for {} {}: code={}, exception={}",
                request.getMethod(),
                request.getRequestURI(),
                failure.code(),
                exception.getClass().getSimpleName(),
                exception
        );

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                status,
                failure.detail()
        );
        problem.setTitle(status.getReasonPhrase());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", failure.code());

        if (exception instanceof OAuth2AuthenticationException oauthException) {
            problem.setProperty(
                    "oauthError",
                    oauthException.getError().getErrorCode()
            );
        }

        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        objectMapper.writeValue(response.getOutputStream(), problem);
    }

    private AuthenticationFailure classify(AuthenticationException exception) {
        if (!(exception instanceof OAuth2AuthenticationException oauthException)) {
            return new AuthenticationFailure(
                    "AUTHENTICATION_REQUIRED",
                    "Authentication is required."
            );
        }

        return switch (oauthException.getError().getErrorCode()) {
            case BearerTokenErrorCodes.INVALID_TOKEN ->
                    new AuthenticationFailure(
                            "AUTH_INVALID_ACCESS_TOKEN",
                            "The access token is invalid or expired."
                    );

            case BearerTokenErrorCodes.INVALID_REQUEST ->
                    new AuthenticationFailure(
                            "AUTH_INVALID_BEARER_REQUEST",
                            "The bearer authentication request is malformed."
                    );

            case BearerTokenErrorCodes.INSUFFICIENT_SCOPE ->
                    new AuthenticationFailure(
                            "AUTH_INSUFFICIENT_SCOPE",
                            "The access token does not grant the required permissions."
                    );

            default ->
                    new AuthenticationFailure(
                            "AUTHENTICATION_FAILED",
                            "Authentication failed."
                    );
        };
    }

    private record AuthenticationFailure(
            String code,
            String detail
    ) {}
}
