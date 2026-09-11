package com.debtulator.backend.auth;

import com.debtulator.backend.auth.dto.ChangePasswordRequest;
import com.debtulator.backend.auth.dto.EmailConfirmationRequest;
import com.debtulator.backend.auth.dto.EmailRequest;
import com.debtulator.backend.auth.dto.PasswordResetRequest;
import com.debtulator.backend.auth.dto.RefreshSessionRequest;
import com.debtulator.backend.auth.dto.RegisterRequest;
import com.debtulator.backend.auth.dto.SignInRequest;
import com.debtulator.backend.auth.supabase.SupabaseAuthException;
import com.debtulator.backend.auth.supabase.SupabaseAuthGateway;
import com.debtulator.backend.auth.supabase.SupabaseAuthResult;
import com.debtulator.backend.auth.supabase.SupabaseSession;
import com.debtulator.backend.auth.supabase.SupabaseUser;
import com.debtulator.backend.exceptions.AuthOperationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private SupabaseAuthGateway authGateway;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(authGateway);
    }

    @Test
    void registrationRequiresVerificationWhenSupabaseReturnsNoSession() {
        SupabaseUser user = user(false);
        when(authGateway.register(
                "ben@example.com",
                "strong-password",
                null,
                "127.0.0.1"
        )).thenReturn(new SupabaseAuthResult(user, null));

        var response = authService.register(
                new RegisterRequest(
                        "ben@example.com",
                        "strong-password",
                        null
                ),
                "127.0.0.1"
        );

        assertThat(response.emailVerificationRequired()).isTrue();
        assertThat(response.session()).isNull();
    }

    @Test
    void signInReturnsAccessAndRefreshTokens() {
        SupabaseSession session = session();
        when(authGateway.signIn(
                "ben@example.com",
                "strong-password",
                null,
                "127.0.0.1"
        )).thenReturn(new SupabaseAuthResult(session.user(), session));

        var response = authService.signIn(
                new SignInRequest(
                        "ben@example.com",
                        "strong-password",
                        null
                ),
                "127.0.0.1"
        );

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.user().email()).isEqualTo("ben@example.com");
    }

    @Test
    void signInDoesNotExposeProviderDetailsForInvalidCredentials() {
        when(authGateway.signIn(
                "ben@example.com",
                "wrong-password",
                null,
                "127.0.0.1"
        )).thenThrow(new SupabaseAuthException(
                400,
                "invalid_credentials",
                "Provider-specific message"
        ));

        assertThatThrownBy(() -> authService.signIn(
                new SignInRequest(
                        "ben@example.com",
                        "wrong-password",
                        null
                ),
                "127.0.0.1"
        ))
                .isInstanceOf(AuthOperationException.class)
                .satisfies(exception -> {
                    AuthOperationException authException =
                            (AuthOperationException) exception;
                    assertThat(authException.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(authException.getCode()).isEqualTo("AUTH_INVALID_CREDENTIALS");
                    assertThat(authException.getMessage()).isEqualTo("Invalid email or password.");
                });
    }

    @Test
    void emailConfirmationUsesSupabaseSignupTokenType() {
        SupabaseSession session = session();
        when(authGateway.verifyTokenHash(
                "signup-hash",
                "signup",
                "127.0.0.1"
        )).thenReturn(new SupabaseAuthResult(session.user(), session));

        var response = authService.confirmEmail(
                new EmailConfirmationRequest("signup-hash"),
                "127.0.0.1"
        );

        assertThat(response.accessToken()).isEqualTo("access-token");
    }

    @Test
    void refreshUsesRefreshTokenWithoutRequiringAccessToken() {
        SupabaseSession session = session();
        when(authGateway.refresh("refresh-token", "127.0.0.1"))
                .thenReturn(new SupabaseAuthResult(session.user(), session));

        var response = authService.refresh(
                new RefreshSessionRequest("refresh-token"),
                "127.0.0.1"
        );

        assertThat(response.accessToken()).isEqualTo("access-token");
    }

    @Test
    void passwordRecoveryVerifiesRecoveryHashBeforeChangingPassword() {
        SupabaseSession recoverySession = session();
        when(authGateway.verifyTokenHash(
                "recovery-hash",
                "recovery",
                "127.0.0.1"
        )).thenReturn(new SupabaseAuthResult(
                recoverySession.user(),
                recoverySession
        ));

        authService.resetPassword(
                new PasswordResetRequest(
                        "recovery-hash",
                        "new-strong-password"
                ),
                "127.0.0.1"
        );

        verify(authGateway).updatePassword(
                "access-token",
                "new-strong-password",
                null,
                null
        );
        verify(authGateway).signOut("access-token", "global");
    }

    @Test
    void localSignOutRevokesOnlyCurrentSupabaseSession() {
        authService.signOut("access-token");
        verify(authGateway).signOut("access-token", "local");
    }

    @Test
    void signOutIsIdempotentWhenSupabaseSessionIsAlreadyGone() {
        org.mockito.Mockito.doThrow(new SupabaseAuthException(
                401,
                "session_not_found",
                "Session not found"
        )).when(authGateway).signOut("access-token", "local");

        authService.signOut("access-token");

        verify(authGateway).signOut("access-token", "local");
    }

    @Test
    void changePasswordPassesOptionalReauthenticationNonce() {
        authService.changePassword(
                "access-token",
                new ChangePasswordRequest(
                        "new-strong-password",
                        "old-strong-password",
                        "12345678"
                )
        );

        verify(authGateway).updatePassword(
                "access-token",
                "new-strong-password",
                "old-strong-password",
                "12345678"
        );
    }

    private SupabaseSession session() {
        return new SupabaseSession(
                "access-token",
                "refresh-token",
                3600,
                1_800_000_000L,
                "bearer",
                user(true)
        );
    }

    private SupabaseUser user(boolean confirmed) {
        return new SupabaseUser(
                UUID.randomUUID(),
                "ben@example.com",
                confirmed
        );
    }
}
