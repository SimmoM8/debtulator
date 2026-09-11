package com.debtulator.backend.auth.supabase;

public interface SupabaseAuthGateway {

    SupabaseAuthResult register(
            String email,
            String password,
            String captchaToken,
            String clientIp
    );

    SupabaseAuthResult signIn(
            String email,
            String password,
            String captchaToken,
            String clientIp
    );

    SupabaseAuthResult refresh(String refreshToken, String clientIp);

    SupabaseAuthResult verifyTokenHash(
            String tokenHash,
            String type,
            String clientIp
    );

    void resendSignup(String email, String captchaToken, String clientIp);

    void requestPasswordRecovery(
            String email,
            String captchaToken,
            String clientIp
    );

    SupabaseUser updatePassword(
            String accessToken,
            String newPassword,
            String currentPassword,
            String nonce
    );

    void reauthenticate(String accessToken);

    void signOut(String accessToken, String scope);

    SupabaseUser getUser(String accessToken);
}
