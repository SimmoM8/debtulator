import type { BackendClient } from "@/src/data/backend/BackendClient";

export async function getLinkedMemberUsername(
  backend: BackendClient,
  memberId: string,
): Promise<string> {
  const response = await backend.get<unknown>(
    `/api/v1/member-linking/members/${encodeURIComponent(memberId)}/username`,
  );

  if (
    typeof response !== "object" ||
    response === null ||
    !("username" in response) ||
    typeof response.username !== "string" ||
    !response.username.trim()
  ) {
    throw new Error("Backend returned an invalid linked member username.");
  }

  return response.username;
}
