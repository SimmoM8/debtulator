const REQUEST_TIMEOUT_MS = 15_000;

export type AccessTokenProvider = (options?: {
  forceRefresh?: boolean;
}) => Promise<string>;

type ProblemDetail = Record<string, unknown> & {
  title?: unknown;
  detail?: unknown;
  code?: unknown;
  retryAfterSeconds?: unknown;
};

type RequestInput = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

type Authentication =
  | { type: "session" }
  | { type: "none" }
  | { type: "access_token"; accessToken: string };

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfterSeconds: number | null = null,
    readonly problem: ProblemDetail | null = null,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

/**
 * The single HTTP transport boundary for the Debtulator backend.
 *
 * Feature code may describe endpoint semantics, but no other frontend file
 * should implement fetch, backend URL construction, timeouts, bearer headers,
 * token-refresh retry, or ProblemDetail parsing.
 */
export class BackendClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly getAccessToken: AccessTokenProvider | null = null,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async get<T>(path: string): Promise<T> {
    return this.requestJson<T>(path, { method: "GET" }, { type: "session" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>(
      path,
      { method: "POST", body },
      { type: "session" },
    );
  }

  async postVoid(path: string, body?: unknown): Promise<void> {
    await this.request(path, { method: "POST", body }, { type: "session" });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>(
      path,
      { method: "PUT", body },
      { type: "session" },
    );
  }

  async delete(path: string): Promise<void> {
    await this.request(path, { method: "DELETE" }, { type: "session" });
  }

  async postPublic<T>(path: string, body: unknown): Promise<T> {
    return this.requestJson<T>(
      path,
      { method: "POST", body },
      { type: "none" },
    );
  }

  async postPublicVoid(path: string, body?: unknown): Promise<void> {
    await this.request(path, { method: "POST", body }, { type: "none" });
  }

  async postWithAccessTokenVoid(
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<void> {
    await this.request(
      path,
      { method: "POST", body },
      { type: "access_token", accessToken },
    );
  }

  private async requestJson<T>(
    path: string,
    input: RequestInput,
    authentication: Authentication,
  ): Promise<T> {
    const response = await this.request(path, input, authentication);

    try {
      return (await response.json()) as T;
    } catch {
      throw new BackendError(
        "Debtulator received an invalid backend response.",
        502,
        "BACKEND_INVALID_RESPONSE",
      );
    }
  }

  private async request(
    path: string,
    input: RequestInput,
    authentication: Authentication,
  ): Promise<Response> {
    if (authentication.type !== "session") {
      const response = await this.send(
        path,
        input,
        authentication.type === "access_token"
          ? authentication.accessToken
          : null,
      );

      if (!response.ok) {
        throw await createBackendError(response);
      }

      return response;
    }

    if (!this.getAccessToken) {
      throw new BackendError(
        "This backend request requires an authenticated session.",
        0,
        "BACKEND_AUTHENTICATION_REQUIRED",
      );
    }

    let accessToken = await this.getAccessToken();
    let response = await this.send(path, input, accessToken);

    if (response.status === 401) {
      accessToken = await this.getAccessToken({ forceRefresh: true });
      response = await this.send(path, input, accessToken);
    }

    if (!response.ok) {
      throw await createBackendError(response);
    }

    return response;
  }

  private async send(
    path: string,
    input: RequestInput,
    accessToken: string | null,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      Accept: "application/json, application/problem+json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    if (input.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new BackendError(
          "The backend request timed out.",
          0,
          "BACKEND_REQUEST_TIMEOUT",
        );
      }

      throw new BackendError(
        "Debtulator could not reach the backend.",
        0,
        "BACKEND_NETWORK_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function createBackendError(response: Response): Promise<BackendError> {
  const problem = await readProblemDetail(response);

  const code =
    typeof problem?.code === "string" && problem.code.length > 0
      ? problem.code
      : `BACKEND_HTTP_${response.status}`;

  const message =
    typeof problem?.detail === "string" && problem.detail.length > 0
      ? problem.detail
      : typeof problem?.title === "string" && problem.title.length > 0
        ? problem.title
        : `Backend request failed with status ${response.status}.`;

  const problemRetryAfter =
    typeof problem?.retryAfterSeconds === "number" &&
    Number.isFinite(problem.retryAfterSeconds)
      ? problem.retryAfterSeconds
      : null;

  const retryAfterHeader = Number(response.headers.get("Retry-After"));

  return new BackendError(
    message,
    response.status,
    code,
    problemRetryAfter ??
      (Number.isFinite(retryAfterHeader) ? retryAfterHeader : null),
    problem,
  );
}

async function readProblemDetail(
  response: Response,
): Promise<ProblemDetail | null> {
  try {
    const value = (await response.json()) as unknown;

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    return value as ProblemDetail;
  } catch {
    return null;
  }
}
