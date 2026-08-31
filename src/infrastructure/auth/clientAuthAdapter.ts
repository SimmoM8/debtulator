import type { AuthServices } from "@/src/application/ports/authServices";
import { createApiSyncEngine } from "@/src/infrastructure/api/ApiSyncEngine";
import {
    isSupabaseConfigured,
    supabase,
} from "@/src/infrastructure/auth/supabaseAuthClient";

// Intentional platform exception: Supabase Auth remains client-side so refresh
// tokens stay in the platform session store; all data access uses the API.

async function requestBackend<T>(
  path: string,
  input?: RequestInit,
): Promise<T> {
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL ?? ""}${path}`,
    {
      ...input,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...input?.headers,
      },
    },
  );
  if (!response.ok)
    throw new Error(`Backend request failed with status ${response.status}.`);
  return (await response.json()) as T;
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
