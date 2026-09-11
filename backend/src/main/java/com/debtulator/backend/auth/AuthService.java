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
import com.debtulator.backend.auth.supabase.SupabaseAuthException;
import com.debtulator.backend.auth.supabase.SupabaseAuthGateway;
import com.debtulator.backend.auth.supabase.SupabaseAuthResult;
import com.debtulator.backend.auth.supabase.SupabaseSession;
import com.debtulator.backend.auth.supabase.SupabaseUser;
import com.debtulator.backend.exceptions.AuthOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final SupabaseAuthGateway authGateway;

    public RegisterResponse register(RegisterRequest request, String clientIp) {
        try {
            SupabaseAuthResult result = authGateway.register(
                    request.email().trim(),
                    request.password(),
                    request.captchaToken(),
                    clientIp
            );

            AuthSessionResponse session = result.session() != null
                    ? toSessionResponse(result.session())
                    : null;

            return new RegisterResponse(session == null, session);
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.REGISTER);
        }
    }

    public AuthSessionResponse confirmEmail(
            EmailConfirmationRequest request,
            String clientIp
    ) {
        try {
            SupabaseAuthResult result = authGateway.verifyTokenHash(
                    request.tokenHash(),
                    "signup",
                    clientIp
            );
            return requireSession(result, AuthOperation.CONFIRM_EMAIL);
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.CONFIRM_EMAIL);
        }
    }

    public void resendConfirmation(EmailRequest request, String clientIp) {
        try {
            authGateway.resendSignup(
                    request.email().trim(),
                    request.captchaToken(),
                    clientIp
            );
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.RESEND_CONFIRMATION);
        }
    }

    public AuthSessionResponse signIn(SignInRequest request, String clientIp) {
        try {
            SupabaseAuthResult result = authGateway.signIn(
                    request.email().trim(),
                    request.password(),
                    request.captchaToken(),
                    clientIp
            );
            return requireSession(result, AuthOperation.SIGN_IN);
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.SIGN_IN);
        }
    }

    public AuthSessionResponse refresh(RefreshSessionRequest request, String clientIp) {
        try {
            SupabaseAuthResult result = authGateway.refresh(
                    request.refreshToken(),
                    clientIp
            );
            return requireSession(result, AuthOperation.REFRESH);
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.REFRESH);
        }
    }

    public void signOut(String accessToken) {
        try {
            authGateway.signOut(accessToken, "local");
        } catch (SupabaseAuthException exception) {
            if (isAlreadySignedOut(exception)) {
                return;
            }
            throw mapException(exception, AuthOperation.SIGN_OUT);
        }
    }

    public void requestPasswordRecovery(EmailRequest request, String clientIp) {
        try {
            authGateway.requestPasswordRecovery(
                    request.email().trim(),
                    request.captchaToken(),
                    clientIp
            );
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.RECOVERY_REQUEST);
        }
    }

    public void resetPassword(PasswordResetRequest request, String clientIp) {
        try {
            SupabaseAuthResult recovery = authGateway.verifyTokenHash(
                    request.tokenHash(),
                    "recovery",
                    clientIp
            );
            SupabaseSession session = requireSupabaseSession(
                    recovery,
                    AuthOperation.RESET_PASSWORD
            );

            authGateway.updatePassword(
                    session.accessToken(),
                    request.newPassword(),
                    null,
                    null
            );
            try {
                authGateway.signOut(session.accessToken(), "global");
            } catch (SupabaseAuthException exception) {
                if (!isAlreadySignedOut(exception)) {
                    throw exception;
                }
            }
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.RESET_PASSWORD);
        }
    }

    public void requestPasswordReauthentication(String accessToken) {
        try {
            authGateway.reauthenticate(accessToken);
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.REAUTHENTICATE);
        }
    }

    public void changePassword(
            String accessToken,
            ChangePasswordRequest request
    ) {
        try {
            authGateway.updatePassword(
                    accessToken,
                    request.newPassword(),
                    request.currentPassword(),
                    request.nonce()
            );
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.CHANGE_PASSWORD);
        }
    }

    public AuthUserResponse me(String accessToken) {
        try {
            return toUserResponse(authGateway.getUser(accessToken));
        } catch (SupabaseAuthException exception) {
            throw mapException(exception, AuthOperation.ME);
        }
    }

    private AuthSessionResponse requireSession(
            SupabaseAuthResult result,
            AuthOperation operation
    ) {
        return toSessionResponse(requireSupabaseSession(result, operation));
    }

    private SupabaseSession requireSupabaseSession(
            SupabaseAuthResult result,
            AuthOperation operation
    ) {
        if (result.session() == null) {
            throw new AuthOperationException(
                    HttpStatus.BAD_GATEWAY,
                    "AUTH_INVALID_PROVIDER_RESPONSE",
                    "The authentication provider returned an incomplete response."
            );
        }
        return result.session();
    }

    private AuthSessionResponse toSessionResponse(SupabaseSession session) {
        return new AuthSessionResponse(
                session.accessToken(),
                session.refreshToken(),
                session.expiresIn(),
                session.expiresAt(),
                session.tokenType(),
                toUserResponse(session.user())
        );
    }

    private AuthUserResponse toUserResponse(SupabaseUser user) {
        return new AuthUserResponse(
                user.id(),
                user.email(),
                user.emailConfirmed()
        );
    }

    private boolean isAlreadySignedOut(SupabaseAuthException exception) {
        return "session_not_found".equals(exception.errorCode())
                || "session_expired".equals(exception.errorCode())
                || "user_not_found".equals(exception.errorCode());
    }

    private AuthOperationException mapException(
            SupabaseAuthException exception,
            AuthOperation operation
    ) {
        if (exception.statusCode() == 429) {
            return new AuthOperationException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "AUTH_RATE_LIMITED",
                    "Too many authentication requests. Try again later."
            );
        }

        if (exception.statusCode() >= 500 || exception.statusCode() == 0) {
            return new AuthOperationException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AUTH_PROVIDER_UNAVAILABLE",
                    "Authentication is temporarily unavailable."
            );
        }

        String providerCode = exception.errorCode();
        if ("captcha_failed".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.BAD_REQUEST,
                    "AUTH_CAPTCHA_FAILED",
                    "Human verification failed. Try again."
            );
        }

        if ("invalid_credentials".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.UNAUTHORIZED,
                    "AUTH_INVALID_CREDENTIALS",
                    "Invalid email or password."
            );
        }

        if ("email_not_confirmed".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.FORBIDDEN,
                    "AUTH_EMAIL_NOT_CONFIRMED",
                    "Confirm your email address before signing in."
            );
        }

        if ("user_already_exists".equals(providerCode)
                || "email_exists".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.CONFLICT,
                    "AUTH_ACCOUNT_ALREADY_EXISTS",
                    "An account already uses those credentials."
            );
        }

        if ("weak_password".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.BAD_REQUEST,
                    "AUTH_WEAK_PASSWORD",
                    "The password does not meet the configured password requirements."
            );
        }

        if ("same_password".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.BAD_REQUEST,
                    "AUTH_PASSWORD_UNCHANGED",
                    "The new password must be different from the current password."
            );
        }

        if ("current_password_invalid".equals(providerCode)
                || "current_password_required".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.PRECONDITION_REQUIRED,
                    "AUTH_CURRENT_PASSWORD_REQUIRED",
                    "The current password is required and must be correct."
            );
        }

        if ("reauthentication_needed".equals(providerCode)
                || "reauthentication_not_valid".equals(providerCode)) {
            return new AuthOperationException(
                    HttpStatus.PRECONDITION_REQUIRED,
                    "AUTH_REAUTHENTICATION_REQUIRED",
                    "Reauthentication is required before changing the password."
            );
        }

        if (operation == AuthOperation.SIGN_IN) {
            return new AuthOperationException(
                    HttpStatus.UNAUTHORIZED,
                    "AUTH_INVALID_CREDENTIALS",
                    "Invalid email or password."
            );
        }

        if (operation == AuthOperation.REFRESH
                || operation == AuthOperation.SIGN_OUT
                || operation == AuthOperation.ME) {
            return new AuthOperationException(
                    HttpStatus.UNAUTHORIZED,
                    "AUTH_SESSION_INVALID",
                    "The authentication session is no longer valid."
            );
        }

        if (operation == AuthOperation.CONFIRM_EMAIL
                || operation == AuthOperation.RESET_PASSWORD) {
            return new AuthOperationException(
                    HttpStatus.BAD_REQUEST,
                    "AUTH_TOKEN_INVALID",
                    "The authentication link is invalid or has expired."
            );
        }

        if (operation == AuthOperation.RECOVERY_REQUEST
                || operation == AuthOperation.RESEND_CONFIRMATION) {
            return new AuthOperationException(
                    HttpStatus.BAD_REQUEST,
                    "AUTH_REQUEST_INVALID",
                    "The authentication request could not be processed."
            );
        }

        return new AuthOperationException(
                HttpStatus.BAD_REQUEST,
                "AUTH_REQUEST_INVALID",
                "The authentication request could not be processed."
        );
    }

    private enum AuthOperation {
        REGISTER,
        CONFIRM_EMAIL,
        RESEND_CONFIRMATION,
        SIGN_IN,
        REFRESH,
        SIGN_OUT,
        RECOVERY_REQUEST,
        RESET_PASSWORD,
        REAUTHENTICATE,
        CHANGE_PASSWORD,
        ME
    }
}
