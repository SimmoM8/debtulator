package com.debtulator.backend.auth;

import com.debtulator.backend.auth.dto.AuthSessionResponse;
import com.debtulator.backend.auth.dto.AuthUserResponse;
import com.debtulator.backend.auth.dto.ChangePasswordRequest;
import com.debtulator.backend.auth.dto.EmailConfirmationRequest;
import com.debtulator.backend.auth.dto.EmailRequest;
import com.debtulator.backend.auth.dto.PasswordResetRequest;
import com.debtulator.backend.auth.dto.RefreshSessionRequest;
import com.debtulator.backend.auth.dto.RegisterRequest;
import com.debtulator.backend.auth.dto.RegisterResponse;
import com.debtulator.backend.auth.dto.SignInRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @SecurityRequirements
    public ResponseEntity<RegisterResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        RegisterResponse response = authService.register(
                request,
                httpRequest.getRemoteAddr()
        );

        HttpStatus status = response.emailVerificationRequired()
                ? HttpStatus.ACCEPTED
                : HttpStatus.CREATED;

        return noStore(ResponseEntity.status(status)).body(response);
    }

    @PostMapping("/email/confirm")
    @SecurityRequirements
    public ResponseEntity<AuthSessionResponse> confirmEmail(
            @Valid @RequestBody EmailConfirmationRequest request,
            HttpServletRequest httpRequest
    ) {
        return noStore(ResponseEntity.ok()).body(
                authService.confirmEmail(request, httpRequest.getRemoteAddr())
        );
    }

    @PostMapping("/email/resend")
    @SecurityRequirements
    public ResponseEntity<Void> resendConfirmation(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.resendConfirmation(request, httpRequest.getRemoteAddr());
        return noStore(ResponseEntity.status(HttpStatus.ACCEPTED)).build();
    }

    @PostMapping("/sign-in")
    @SecurityRequirements
    public ResponseEntity<AuthSessionResponse> signIn(
            @Valid @RequestBody SignInRequest request,
            HttpServletRequest httpRequest
    ) {
        return noStore(ResponseEntity.ok()).body(
                authService.signIn(request, httpRequest.getRemoteAddr())
        );
    }

    @PostMapping("/refresh")
    @SecurityRequirements
    public ResponseEntity<AuthSessionResponse> refresh(
            @Valid @RequestBody RefreshSessionRequest request,
            HttpServletRequest httpRequest
    ) {
        return noStore(ResponseEntity.ok()).body(
                authService.refresh(request, httpRequest.getRemoteAddr())
        );
    }

    @PostMapping("/sign-out")
    public ResponseEntity<Void> signOut(@AuthenticationPrincipal Jwt jwt) {
        authService.signOut(jwt.getTokenValue());
        return noStore(ResponseEntity.status(HttpStatus.NO_CONTENT)).build();
    }

    @PostMapping("/password/recovery")
    @SecurityRequirements
    public ResponseEntity<Void> requestPasswordRecovery(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.requestPasswordRecovery(request, httpRequest.getRemoteAddr());
        return noStore(ResponseEntity.status(HttpStatus.ACCEPTED)).build();
    }

    @PostMapping("/password/reset")
    @SecurityRequirements
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody PasswordResetRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.resetPassword(request, httpRequest.getRemoteAddr());
        return noStore(ResponseEntity.status(HttpStatus.NO_CONTENT)).build();
    }

    @PostMapping("/password/reauthenticate")
    public ResponseEntity<Void> requestPasswordReauthentication(
            @AuthenticationPrincipal Jwt jwt
    ) {
        authService.requestPasswordReauthentication(jwt.getTokenValue());
        return noStore(ResponseEntity.status(HttpStatus.ACCEPTED)).build();
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(jwt.getTokenValue(), request);
        return noStore(ResponseEntity.status(HttpStatus.NO_CONTENT)).build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        return noStore(ResponseEntity.ok()).body(
                authService.me(jwt.getTokenValue())
        );
    }

    private ResponseEntity.BodyBuilder noStore(ResponseEntity.BodyBuilder builder) {
        return builder
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache");
    }
}
