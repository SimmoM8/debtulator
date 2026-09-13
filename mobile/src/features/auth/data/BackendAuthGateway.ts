import {
  BackendClient,
  BackendError,
} from "@/src/data/backend/BackendClient";
import { parseAuthSession, type AuthSession } from "@/src/features/auth/model/AuthSession";

type RegisterResponse = {
  emailVerificationRequired: boolean;
  session: AuthSession | null;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

/**
 * Authentication protocol adapter. HTTP transport remains centralized in
 * BackendClient; this class only owns auth endpoint semantics and parsing.
 */
export class BackendAuthGateway {
  private readonly backend: BackendClient;

  constructor(baseUrl: string) {
    this.backend = new BackendClient(baseUrl);
  }

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<AuthSession> {
    const value = await this.run(() =>
      this.backend.postPublic<unknown>("/api/v1/auth/sign-in", {
        email: input.email,
        password: input.password,
      }),
    );

    return parseSessionResponse(value);
  }

  async register(input: {
    email: string;
    password: string;
  }): Promise<RegisterResponse> {
    const value = await this.run(() =>
      this.backend.postPublic<unknown>("/api/v1/auth/register", {
        email: input.email,
        password: input.password,
      }),
    );

    return parseRegisterResponse(value);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const value = await this.run(() =>
      this.backend.postPublic<unknown>("/api/v1/auth/refresh", {
        refreshToken,
      }),
    );

    return parseSessionResponse(value);
  }

  async signOut(accessToken: string): Promise<void> {
    await this.run(() =>
      this.backend.postWithAccessTokenVoid(
        "/api/v1/auth/sign-out",
        accessToken,
      ),
    );
  }

  async requestPasswordRecovery(email: string): Promise<void> {
    await this.run(() =>
      this.backend.postPublicVoid("/api/v1/auth/password/recovery", { email }),
    );
  }

  async resendConfirmation(email: string): Promise<void> {
    await this.run(() =>
      this.backend.postPublicVoid("/api/v1/auth/email/resend", { email }),
    );
  }

  async confirmEmail(tokenHash: string): Promise<AuthSession> {
    const value = await this.run(() =>
      this.backend.postPublic<unknown>("/api/v1/auth/email/confirm", {
        tokenHash,
      }),
    );

    return parseSessionResponse(value);
  }

  async resetPassword(input: {
    tokenHash: string;
    newPassword: string;
  }): Promise<void> {
    await this.run(() =>
      this.backend.postPublicVoid("/api/v1/auth/password/reset", {
        tokenHash: input.tokenHash,
        newPassword: input.newPassword,
      }),
    );
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof BackendError) {
        throw toAuthApiError(error);
      }

      throw error;
    }
  }
}

function parseSessionResponse(value: unknown): AuthSession {
  try {
    return parseAuthSession(value);
  } catch {
    throw new AuthApiError(
      "Debtulator received an invalid authentication session.",
      502,
      "AUTH_INVALID_RESPONSE",
    );
  }
}

function parseRegisterResponse(value: unknown): RegisterResponse {
  const object = requireObject(value, "registration response");
  const emailVerificationRequired = requireBoolean(
    object.emailVerificationRequired,
    "emailVerificationRequired",
  );

  const session =
    object.session === null ? null : parseSessionResponse(object.session);

  if (!emailVerificationRequired && session === null) {
    throw new AuthApiError(
      "Debtulator received an incomplete registration response.",
      502,
      "AUTH_INVALID_RESPONSE",
    );
  }

  return {
    emailVerificationRequired,
    session,
  };
}

function toAuthApiError(error: BackendError): AuthApiError {
  return new AuthApiError(
    error.code === "BACKEND_INVALID_RESPONSE"
      ? "Debtulator received an invalid authentication response."
      : error.message,
    error.status,
    mapAuthErrorCode(error.code),
    parseFieldErrors(error.problem?.errors),
  );
}

function mapAuthErrorCode(code: string): string {
  switch (code) {
    case "BACKEND_INVALID_RESPONSE":
      return "AUTH_INVALID_RESPONSE";
    case "BACKEND_REQUEST_TIMEOUT":
      return "AUTH_REQUEST_TIMEOUT";
    case "BACKEND_NETWORK_UNAVAILABLE":
      return "AUTH_NETWORK_UNAVAILABLE";
    default:
      return code;
  }
}

function parseFieldErrors(value: unknown): Readonly<Record<string, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const errors: Record<string, string> = {};

  for (const [field, message] of Object.entries(value)) {
    if (typeof message === "string") {
      errors[field] = message;
    }
  }

  return errors;
}

function requireObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AuthApiError(
      `Debtulator received an invalid ${field}.`,
      502,
      "AUTH_INVALID_RESPONSE",
    );
  }

  return value as Record<string, unknown>;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new AuthApiError(
      `Debtulator received an invalid ${field}.`,
      502,
      "AUTH_INVALID_RESPONSE",
    );
  }

  return value;
}
