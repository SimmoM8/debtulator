package com.debtulator.backend.exceptions;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.debtulator.backend.profiles.ProfileServiceException;
import com.debtulator.backend.userdiscovery.UserDiscoveryException;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ProblemDetail handleValidation(
                        MethodArgumentNotValidException exception,
                        HttpServletRequest request) {
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                HttpStatus.BAD_REQUEST,
                                "Request validation failed.");
                problem.setTitle("Validation failed");
                problem.setInstance(URI.create(request.getRequestURI()));

                Map<String, String> errors = new LinkedHashMap<>();
                for (FieldError error : exception.getBindingResult().getFieldErrors()) {
                        errors.putIfAbsent(
                                        error.getField(),
                                        error.getDefaultMessage() != null
                                                        ? error.getDefaultMessage()
                                                        : "Invalid value.");
                }
                problem.setProperty("errors", errors);
                return problem;
        }

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ProblemDetail handleUnreadableRequest(
                        HttpMessageNotReadableException exception,
                        HttpServletRequest request) {
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                HttpStatus.BAD_REQUEST,
                                "The request body could not be read.");
                problem.setTitle("Invalid request body");
                problem.setInstance(URI.create(request.getRequestURI()));
                return problem;
        }

        @ExceptionHandler(AuthOperationException.class)
        public ProblemDetail handleAuthOperation(
                        AuthOperationException exception,
                        HttpServletRequest request) {
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                exception.getStatus(),
                                exception.getMessage());
                problem.setTitle("Authentication request failed");
                problem.setInstance(URI.create(request.getRequestURI()));
                problem.setProperty("code", exception.getCode());
                return problem;
        }

        @ExceptionHandler(ProfileServiceException.class)
        public ProblemDetail handleProfileService(
                        ProfileServiceException exception,
                        HttpServletRequest request) {
                HttpStatus status = switch (exception.getReason()) {
                        case NOT_FOUND -> HttpStatus.NOT_FOUND;
                        case INVALID_DISPLAY_NAME, CURRENCY_NOT_SUPPORTED ->
                                HttpStatus.BAD_REQUEST;
                };

                String code = switch (exception.getReason()) {
                        case NOT_FOUND -> "PROFILE_NOT_FOUND";
                        case INVALID_DISPLAY_NAME -> "PROFILE_INVALID_DISPLAY_NAME";
                        case CURRENCY_NOT_SUPPORTED -> "PROFILE_CURRENCY_NOT_SUPPORTED";
                };

                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                status,
                                exception.getMessage());
                problem.setTitle("Profile request failed");
                problem.setInstance(URI.create(request.getRequestURI()));
                problem.setProperty("code", code);
                return problem;
        }

        @ExceptionHandler(UserDiscoveryException.class)
        public ResponseEntity<ProblemDetail> handleUserDiscovery(
                        UserDiscoveryException exception,
                        HttpServletRequest request) {
                HttpStatus status = switch (exception.getReason()) {
                        case INVALID_QUERY -> HttpStatus.BAD_REQUEST;
                        case RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
                };

                String code = switch (exception.getReason()) {
                        case INVALID_QUERY -> "USER_DISCOVERY_INVALID_QUERY";
                        case RATE_LIMITED -> "USER_DISCOVERY_RATE_LIMITED";
                };

                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                status,
                                exception.getMessage());
                problem.setTitle("User discovery request failed");
                problem.setInstance(URI.create(request.getRequestURI()));
                problem.setProperty("code", code);

                ResponseEntity.BodyBuilder response = ResponseEntity.status(status);

                if (exception.getRetryAfterSeconds() != null) {
                        problem.setProperty(
                                        "retryAfterSeconds",
                                        exception.getRetryAfterSeconds());
                        response.header(
                                        HttpHeaders.RETRY_AFTER,
                                        Long.toString(exception.getRetryAfterSeconds()));
                }

                return response
                                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                                .header(HttpHeaders.PRAGMA, "no-cache")
                                .body(problem);
        }

        @ExceptionHandler(InvalidSyncRequestException.class)
        public ProblemDetail handleInvalidSyncRequest(
                        InvalidSyncRequestException exception,
                        HttpServletRequest request) {
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                HttpStatus.BAD_REQUEST,
                                exception.getMessage());
                problem.setTitle("Invalid sync request");
                problem.setInstance(URI.create(request.getRequestURI()));
                return problem;
        }

        @ExceptionHandler(SyncCursorExpiredException.class)
        public ProblemDetail handleExpiredSyncCursor(
                        SyncCursorExpiredException exception,
                        HttpServletRequest request) {
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                HttpStatus.GONE,
                                "The sync cursor is no longer available. A full bootstrap is required.");
                problem.setTitle("Sync cursor expired");
                problem.setInstance(URI.create(request.getRequestURI()));
                problem.setProperty(
                                "minimumCursor",
                                Long.toString(exception.getMinimumCursor()));
                return problem;
        }

        @ExceptionHandler(Exception.class)
        public ProblemDetail handleUnexpectedException(
                        Exception exception,
                        HttpServletRequest request) {
                log.error(
                                "Unhandled exception while processing {}",
                                request.getRequestURI(),
                                exception);

                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                HttpStatus.INTERNAL_SERVER_ERROR,
                                "An unexpected error occurred.");
                problem.setTitle("Internal server error");
                problem.setInstance(URI.create(request.getRequestURI()));
                return problem;
        }
}
