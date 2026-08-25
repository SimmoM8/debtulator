import type { AuthServices } from "@/src/application/ports/authServices";
import { createApiSyncEngine } from "@/src/infrastructure/api/ApiSyncEngine";
import {
  isSupabaseConfigured,
  supabase,
} from "@/src/infrastructure/auth/supabaseAuthClient";

type ApiResponse<T> = {
  data: T;
  requestId: string;
};

async function requestBackend<T>(
  path: string,
  input?: RequestInit,
): Promise<T> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }

  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;

  const url = `${apiUrl}${path}`;

  const response = await fetch(url, {
    ...input,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...input?.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Backend request to ${url} failed with status ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  if (!contentType.includes("json")) {
    const body = await response.text();

    throw new Error(
      `Backend request to ${url} expected JSON but received ${
        contentType || "unknown content type"
      }: ${body.slice(0, 300)}`,
    );
  }

  const result = (await response.json()) as ApiResponse<T>;

  return result.data;
}

export const supabaseAuthServices: AuthServices = {
  configured: isSupabaseConfigured,
  client: supabase,
  async getAccessToken() {
    if (!supabase) return null;
    return (
      (await supabase.auth.getSession()).data.session?.access_token ?? null
    );
  },
  getAcceptedLinkedMemberProfile: (userId: string) =>
    requestBackend(`/api/v1/member-links/${userId}/profile`),
  counterRemoteDebtVerification: (input: unknown) =>
    requestBackend("/api/v1/debt-verifications/counter", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    }),
  createRemoteDebtVerification: (input: unknown) =>
    requestBackend("/api/v1/debt-verifications", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    }),
  fetchRemoteStage2Records: (input: unknown) =>
    requestBackend("/api/v1/sync/stage-two", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
    }),
  runSyncEngine: createApiSyncEngine(requestBackend),
};
