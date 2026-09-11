package com.debtulator.backend.auth.supabase;

import com.debtulator.backend.auth.SupabaseAuthProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

@Component
public class SupabaseAuthClient implements SupabaseAuthGateway {

    private final SupabaseAuthProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public SupabaseAuthClient(
            SupabaseAuthProperties properties,
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder
                .baseUrl(normalizeBaseUrl(properties.baseUrl()) + "/auth/v1")
                .defaultHeader("apikey", properties.apiKey())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public SupabaseAuthResult register(
            String email,
            String password,
            String captchaToken,
            String clientIp
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("password", password);
        addCaptcha(body, captchaToken);

        Map<String, Object> response = execute(() -> restClient
                .post()
                .uri(uriBuilder -> uriBuilder
                        .path("/signup")
                        .queryParam("redirect_to", properties.signupRedirectUrl())
                        .build())
                .headers(clientHeaders(clientIp))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class));

        return parseAuthResult(response);
    }

    @Override
    public SupabaseAuthResult signIn(
            String email,
            String password,
            String captchaToken,
            String clientIp
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("password", password);
        addCaptcha(body, captchaToken);

        Map<String, Object> response = execute(() -> restClient
                .post()
                .uri(uriBuilder -> uriBuilder
                        .path("/token")
                        .queryParam("grant_type", "password")
                        .build())
                .headers(clientHeaders(clientIp))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class));

        return parseAuthResult(response);
    }

    @Override
    public SupabaseAuthResult refresh(String refreshToken, String clientIp) {
        Map<String, Object> response = execute(() -> restClient
                .post()
                .uri(uriBuilder -> uriBuilder
                        .path("/token")
                        .queryParam("grant_type", "refresh_token")
                        .build())
                .headers(clientHeaders(clientIp))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("refresh_token", refreshToken))
                .retrieve()
                .body(Map.class));

        return parseAuthResult(response);
    }

    @Override
    public SupabaseAuthResult verifyTokenHash(
            String tokenHash,
            String type,
            String clientIp
    ) {
        Map<String, Object> response = execute(() -> restClient
                .post()
                .uri("/verify")
                .headers(clientHeaders(clientIp))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "token_hash", tokenHash,
                        "type", type
                ))
                .retrieve()
                .body(Map.class));

        return parseAuthResult(response);
    }

    @Override
    public void resendSignup(
            String email,
            String captchaToken,
            String clientIp
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        body.put("type", "signup");
        addCaptcha(body, captchaToken);

        executeVoid(() -> restClient
                .post()
                .uri(uriBuilder -> uriBuilder
                        .path("/resend")
                        .queryParam("redirect_to", properties.signupRedirectUrl())
                        .build())
                .headers(clientHeaders(clientIp))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public void requestPasswordRecovery(
            String email,
            String captchaToken,
            String clientIp
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", email);
        addCaptcha(body, captchaToken);

        executeVoid(() -> restClient
                .post()
                .uri(uriBuilder -> uriBuilder
                        .path("/recover")
                        .queryParam("redirect_to", properties.recoveryRedirectUrl())
                        .build())
                .headers(clientHeaders(clientIp))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public SupabaseUser updatePassword(
            String accessToken,
            String newPassword,
            String currentPassword,
            String nonce
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("password", newPassword);
        if (StringUtils.hasText(currentPassword)) {
            body.put("current_password", currentPassword);
        }
        if (StringUtils.hasText(nonce)) {
            body.put("nonce", nonce);
        }

        Map<String, Object> response = execute(() -> restClient
                .put()
                .uri("/user")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class));

        return parseUser(response);
    }

    @Override
    public void reauthenticate(String accessToken) {
        executeVoid(() -> restClient
                .post()
                .uri("/reauthenticate")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public void signOut(String accessToken, String scope) {
        executeVoid(() -> restClient
                .post()
                .uri(uriBuilder -> uriBuilder
                        .path("/logout")
                        .queryParam("scope", scope)
                        .build())
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public SupabaseUser getUser(String accessToken) {
        Map<String, Object> response = execute(() -> restClient
                .get()
                .uri("/user")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .retrieve()
                .body(Map.class));

        return parseUser(response);
    }

    private SupabaseAuthResult parseAuthResult(Map<String, Object> response) {
        if (response == null || response.isEmpty()) {
            throw invalidProviderResponse();
        }

        if (!response.containsKey("access_token")) {
            return new SupabaseAuthResult(parseUser(response), null);
        }

        SupabaseUser user = parseUser(asMap(response.get("user")));
        String accessToken = requireString(response, "access_token");
        String refreshToken = requireString(response, "refresh_token");
        long expiresIn = requireNumber(response, "expires_in").longValue();
        Long expiresAt = optionalNumber(response, "expires_at");
        String tokenType = requireString(response, "token_type");

        SupabaseSession session = new SupabaseSession(
                accessToken,
                refreshToken,
                expiresIn,
                expiresAt,
                tokenType,
                user
        );
        return new SupabaseAuthResult(user, session);
    }

    private SupabaseUser parseUser(Map<String, Object> response) {
        if (response == null || response.isEmpty()) {
            throw invalidProviderResponse();
        }

        try {
            UUID id = UUID.fromString(requireString(response, "id"));
            String email = requireString(response, "email");
            boolean emailConfirmed = response.get("email_confirmed_at") != null;
            return new SupabaseUser(id, email, emailConfirmed);
        } catch (IllegalArgumentException exception) {
            throw invalidProviderResponse();
        }
    }

    private void addCaptcha(Map<String, Object> body, String captchaToken) {
        if (StringUtils.hasText(captchaToken)) {
            body.put(
                    "gotrue_meta_security",
                    Map.of("captcha_token", captchaToken)
            );
        }
    }

    private Consumer<HttpHeaders> clientHeaders(String clientIp) {
        return headers -> {
            if (properties.forwardClientIp()
                    && StringUtils.hasText(clientIp)
                    && clientIp.length() <= 64) {
                headers.set("Sb-Forwarded-For", clientIp);
            }
        };
    }

    private String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }

    private String requireString(Map<String, Object> values, String key) {
        Object value = values.get(key);
        if (!(value instanceof String text) || text.isBlank()) {
            throw invalidProviderResponse();
        }
        return text;
    }

    private Number requireNumber(Map<String, Object> values, String key) {
        Object value = values.get(key);
        if (!(value instanceof Number number)) {
            throw invalidProviderResponse();
        }
        return number;
    }

    private Long optionalNumber(Map<String, Object> values, String key) {
        Object value = values.get(key);
        return value instanceof Number number
                ? number.longValue()
                : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            throw invalidProviderResponse();
        }
        return (Map<String, Object>) map;
    }

    private SupabaseAuthException invalidProviderResponse() {
        return new SupabaseAuthException(
                502,
                "invalid_provider_response",
                "Supabase Auth returned an invalid response."
        );
    }

    private <T> T execute(RequestSupplier<T> request) {
        try {
            return request.get();
        } catch (RestClientResponseException exception) {
            throw toSupabaseException(exception);
        } catch (ResourceAccessException exception) {
            throw new SupabaseAuthException(
                    0,
                    "provider_unavailable",
                    "Supabase Auth could not be reached."
            );
        }
    }

    private void executeVoid(VoidRequest request) {
        try {
            request.run();
        } catch (RestClientResponseException exception) {
            throw toSupabaseException(exception);
        } catch (ResourceAccessException exception) {
            throw new SupabaseAuthException(
                    0,
                    "provider_unavailable",
                    "Supabase Auth could not be reached."
            );
        }
    }

    private SupabaseAuthException toSupabaseException(
            RestClientResponseException exception
    ) {
        String errorCode = null;
        String message = "Supabase Auth rejected the request.";

        try {
            Map<?, ?> body = objectMapper.readValue(
                    exception.getResponseBodyAsString(),
                    Map.class
            );
            errorCode = firstText(body.get("error_code"), body.get("code"));
            String providerMessage = firstText(body.get("msg"), body.get("message"));
            if (providerMessage != null) {
                message = providerMessage;
            }
        } catch (RuntimeException ignored) {
            // Some upstream 5xx responses are intentionally not JSON.
        }

        return new SupabaseAuthException(
                exception.getStatusCode().value(),
                errorCode,
                message
        );
    }

    private String firstText(Object first, Object second) {
        if (first instanceof String text && !text.isBlank()) {
            return text;
        }
        if (second instanceof String text && !text.isBlank()) {
            return text;
        }
        return null;
    }

    private static String normalizeBaseUrl(String baseUrl) {
        return baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;
    }

    @FunctionalInterface
    private interface RequestSupplier<T> {
        T get();
    }

    @FunctionalInterface
    private interface VoidRequest {
        void run();
    }
}
