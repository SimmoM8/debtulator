import type { BackendClient } from "@/src/data/backend/BackendClient";
import type { LinkedAccountSummary } from "@/src/features/members/model/LinkedAccountSummary";

export async function getLinkedAccountSummaries(
  backend: BackendClient,
): Promise<LinkedAccountSummary[]> {
  const response = await backend.get<unknown>(
    "/api/v1/member-linking/linked-accounts",
  );

  if (!Array.isArray(response)) {
    throw new Error("Backend returned an invalid linked account list.");
  }

  const seen = new Set<string>();

  return response.map((item): LinkedAccountSummary => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("Backend returned an invalid linked account summary.");
    }

    const linkedUserId = "linkedUserId" in item ? item.linkedUserId : null;
    const username = "username" in item ? item.username : null;

    if (
      typeof linkedUserId !== "string" ||
      !linkedUserId ||
      typeof username !== "string" ||
      !username.trim() ||
      seen.has(linkedUserId)
    ) {
      throw new Error("Backend returned an invalid linked account summary.");
    }

    seen.add(linkedUserId);

    return { linkedUserId, username };
  });
}
