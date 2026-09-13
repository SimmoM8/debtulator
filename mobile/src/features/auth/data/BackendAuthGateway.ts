import { parseAuthSession, type AuthSession } from "@/src/features/auth/model/AuthSession";

const REQUEST_TIMEOUT_MS = 15_000;

type ProblemDetail = {
  title?: unknown;
  detail?: unknown;
  code?: unknown;
  errors?: unknown;
};

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

export class BackendAuthGateway {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<AuthSession> {
    const value = await this.requestJson("/api/v1/auth/sign-in", {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
      },
    });

    return parseSessionResponse(value);
  }

  async register(input: {
    email: string;
    password: string;
  }): Promise<RegisterResponse> {
    const value = await this.requestJson("/api/v1/auth/register", {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
      },
    });

    return parseRegisterResponse(value);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const value = await this.requestJson("/api/v1/auth/refresh", {
      method: "POST",
      body: {
        refreshToken,
      },
    });

    return parseSessionResponse(value);
  }

  async signOut(accessToken: string): Promise<void> {
    await this.requestVoid("/api/v1/auth/sign-out", {
      method: "POST",
      accessToken,
    });
  }

  async requestPasswordRecovery(email: string): Promise<void> {
    await this.requestVoid("/api/v1/auth/password/recovery", {
      method: "POST",
      body: {
        email,
      },
    });
  }

  async resendConfirmation(email: string): Promise<void> {
    await this.requestVoid("/api/v1/auth/email/resend", {
      method: "POST",
      body: {
        email,
      },
    });
  }

  async confirmEmail(tokenHash: string): Promise<AuthSession> {
    const value = await this.requestJson("/api/v1/auth/email/confirm", {
      method: "POST",
      body: {
        tokenHash,
      },
    });

    return parseSessionResponse(value);
  }

  async resetPassword(input: {
    tokenHash: string;
    newPassword: string;
  }): Promise<void> {
    await this.requestVoid("/api/v1/auth/password/reset", {
      method: "POST",
      body: {
        tokenHash: input.tokenHash,
        newPassword: input.newPassword,
      },
    });
  }

  private async requestJson(
    path: string,
    input: RequestInput,
  ): Promise<unknown> {
    const response = await this.request(path, input);

    try {
      return await response.json();
    } catch {
      throw new AuthApiError(
        "Debtulator received an invalid authentication response.",
        502,
        "AUTH_INVALID_RESPONSE",
      );
    }
  }

  private async requestVoid(
    path: string,
    input: RequestInput,
  ): Promise<void> {
    await this.request(path, input);
  }

  private async request(path: string, input: RequestInput): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      Accept: "application/json, application/problem+json",
    };

    if (input.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (input.accessToken) {
      headers.Authorization = `Bearer ${input.accessToken}`;
    }

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: input.method,
        headers,
        body:
          input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AuthApiError(
          "The authentication request timed out.",
          0,
          "AUTH_REQUEST_TIMEOUT",
        );
      }

      throw new AuthApiError(
        "Debtulator could not reach the authentication service.",
        0,
        "AUTH_NETWORK_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw await createAuthApiError(response);
    }

    return response;
  }
}

type RequestInput = {
  method: "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
  accessToken?: string;
};

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
    object.session === null
      ? null
      : parseSessionResponse(object.session);

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

async function createAuthApiError(response: Response): Promise<AuthApiError> {
  const problem = await readProblemDetail(response);
  const code =
    typeof problem?.code === "string" && problem.code.length > 0
      ? problem.code
      : `AUTH_HTTP_${response.status}`;

  const message =
    typeof problem?.detail === "string" && problem.detail.length > 0
      ? problem.detail
      : typeof problem?.title === "string" && problem.title.length > 0
        ? problem.title
        : `Authentication request failed with status ${response.status}.`;

  return new AuthApiError(
    message,
    response.status,
    code,
    parseFieldErrors(problem?.errors),
  );
}

async function readProblemDetail(
  response: Response,
): Promise<ProblemDetail | null> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return null;
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
