import type { BackendClient } from "@/src/data/backend/BackendClient";

export async function acceptDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.postVoid(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}/accept`,
  );
}

export async function rejectDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.postVoid(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}/reject`,
  );
}

export async function cancelDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.delete(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}`,
  );
}
