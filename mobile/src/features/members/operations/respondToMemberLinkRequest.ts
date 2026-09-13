import type { BackendClient } from "@/src/data/backend/BackendClient";

type AcceptMemberLinkRequestInput = {
  requestId: string;
  memberId: string | null;
  useRequesterName: boolean;
};

export async function acceptMemberLinkRequest(
  backend: BackendClient,
  input: AcceptMemberLinkRequestInput,
): Promise<void> {
  await backend.postVoid(
    `/api/v1/member-linking/requests/${encodeURIComponent(input.requestId)}/accept`,
    {
      memberId: input.memberId,
      displayName: null,
      useRequesterName: input.useRequesterName,
    },
  );
}

export async function rejectMemberLinkRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.postVoid(
    `/api/v1/member-linking/requests/${encodeURIComponent(requestId)}/reject`,
  );
}
