import type { BackendClient } from "@/src/data/backend/BackendClient";

export type RequestMemberLinkInput = {
  requestId: string;
  targetUserId: string;
  memberId: string;
  displayName: string;
  useTargetName: boolean;
};

export async function requestMemberLink(
  backend: BackendClient,
  input: RequestMemberLinkInput,
): Promise<void> {
  await backend.postVoid("/api/v1/member-linking/requests", input);
}
