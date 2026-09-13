import type { BackendClient } from "@/src/data/backend/BackendClient";
import type { DiscoveredUser } from "@/src/features/members/model/DiscoveredUser";

export async function searchUsers(
  backend: BackendClient,
  query: string,
): Promise<DiscoveredUser[]> {
  const value = await backend.get<unknown>(
    `/api/v1/user-discovery/users?query=${encodeURIComponent(query)}`,
  );

  if (!Array.isArray(value)) {
    throw new Error("Backend returned invalid user discovery results.");
  }

  return value.map(parseDiscoveredUser);
}

function parseDiscoveredUser(value: unknown): DiscoveredUser {
  const object = requireObject(value);

  return {
    id: requireString(object.id, "id"),
    displayName: requireString(object.name, "name"),
    detail:
      object.detail === null
        ? null
        : requireString(object.detail, "detail"),
  };
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Backend returned an invalid user discovery result.");
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Backend returned an invalid user discovery ${field}.`);
  }

  return value;
}
