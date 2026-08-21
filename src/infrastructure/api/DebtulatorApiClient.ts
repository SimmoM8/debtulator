import type { ProblemDetails } from "@/packages/contracts/src";
import type {
    ApiClient,
    ProfileSearchRequest,
} from "@/src/application/ports/apiClient";

export type AccessTokenProvider = () => Promise<string | null>;

export class ApiRequestError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiRequestError";
  }
}

async function readProblem(response: Response): Promise<ProblemDetails> {
  const body = (await response
    .json()
    .catch(() => null)) as ProblemDetails | null;
  return (
    body ?? {
      type: "about:blank",
      title: response.statusText || "Request failed",
      status: response.status,
    }
  );
}

export function createDebtulatorApiClient(
  baseUrl: string,
  accessTokenProvider: AccessTokenProvider,
  fetchImplementation: typeof fetch = fetch,
): ApiClient {
  async function request<T>(
    path: string,
    input: ProfileSearchRequest,
  ): Promise<T>;
  async function request<T>(path: string, input?: RequestInit): Promise<T>;
  async function request<T>(
    path: string,
    input?: ProfileSearchRequest | RequestInit,
  ): Promise<T> {
    const token = await accessTokenProvider();
    const isSearch = input && "query" in input;
    const search = new URLSearchParams();
    if (isSearch) {
      search.set("query", input.query);
      if (input.excludeUserId) search.set("excludeUserId", input.excludeUserId);
      if (input.limit !== undefined) search.set("limit", String(input.limit));
      if (input.cursor) search.set("cursor", input.cursor);
    }

    const queryString = isSearch && search.toString() ? `?${search}` : "";
    const response = await fetchImplementation(
      `${baseUrl.replace(/\/$/, "")}${path}${queryString}`,
      {
        ...(!isSearch ? input : {}),
        headers: {
          Accept: "application/json, application/problem+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(!isSearch ? input?.headers : {}),
        },
      },
    );
    if (!response.ok) throw new ApiRequestError(await readProblem(response));
    return (await response.json()) as T;
  }

  return {
    request,
    memberProfiles: {
      search: (input) => request("/api/v1/member-profiles", input),
    },
  };
}
