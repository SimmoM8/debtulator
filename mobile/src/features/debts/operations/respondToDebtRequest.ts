import type { BackendClient } from "@/src/data/backend/BackendClient";
import { requestSyncAndWait } from "@/src/data/sync/syncSignal";

export async function acceptDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.postVoid(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}/accept`,
  );
  await requestSyncAndWait();
}

export async function rejectDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.postVoid(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}/reject`,
  );
  await requestSyncAndWait();
}

export async function cancelDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<void> {
  await backend.delete(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}`,
  );
  await requestSyncAndWait();
}
