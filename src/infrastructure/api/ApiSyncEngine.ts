import {
    addTelemetryBreadcrumb,
    captureTelemetryException,
    trackFirstSuccess,
    trackTelemetryEvent,
} from "@/src/application/observability/telemetry";
import { canRetrySyncEntry } from "@/src/application/sync/syncPolicy";
import type { SyncQueueEntry } from "@/src/domain/models";
import {
    mapRemoteActivityToLocal,
    mapRemoteAttachmentToLocal,
    mapRemoteCommentToLocal,
    mapRemoteExpenseToLocal,
    mapRemoteGroupDebtToLocal,
    mapRemoteGroupInviteToLocal,
    mapRemoteGroupMemberToLocal,
    mapRemoteGroupParticipantToLocal,
    mapRemoteGroupToLocal,
    mapRemotePaymentToLocal,
    mapRemoteSettlementToLocal,
} from "@/src/infrastructure/sync/mappers";

export type ApiSyncStore = {
  syncQueue: SyncQueueEntry[];
  [key: string]: any;
  updateSyncQueueEntry(
    entryId: string,
    patch: Partial<SyncQueueEntry>,
  ): Promise<SyncQueueEntry>;
};

export type ApiSyncEngine = (input: {
  store: ApiSyncStore;
  userId: string;
  email?: string | null;
  maxItems?: number;
}) => Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  pulled: number;
}>;

export function createApiSyncEngine(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
): ApiSyncEngine {
  return async ({ store, userId, email, maxItems = 25 }) => {
    const entries = store.syncQueue
      .filter((entry) => canRetrySyncEntry(entry))
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      .slice(0, maxItems);
    if (entries.length === 0)
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0, pulled: 0 };

    addTelemetryBreadcrumb("sync", "run_started", {
      syncQueueSize: entries.length,
    });
    trackTelemetryEvent("sync_run_started", { syncQueueSize: entries.length });
    try {
      for (const entry of entries) {
        await store.updateSyncQueueEntry(entry.id, {
          status: "running",
          lastAttemptAt: new Date().toISOString(),
          errorCode: null,
          errorMessage: null,
        });
      }
      const result = await request<{
        data: {
          succeeded: string[];
          failed: string[];
          conflicts: string[];
          pulled: number;
          remote?: Record<string, any[]>;
        };
      }>("/api/v1/sync", {
        method: "POST",
        body: JSON.stringify({ userId, email, entries }),
        headers: { "Content-Type": "application/json" },
      });
      for (const entry of entries) {
        const status = result.data.conflicts.includes(entry.id)
          ? "conflict"
          : result.data.succeeded.includes(entry.id)
            ? "succeeded"
            : "failed";
        await store.updateSyncQueueEntry(entry.id, { status });
      }
      if (result.data.remote)
        await applyPulledRecords(store as any, result.data.remote);
      const summary = {
        processed: entries.length,
        succeeded: result.data.succeeded.length,
        failed: result.data.failed.length,
        conflicts: result.data.conflicts.length,
        pulled: result.data.pulled,
      };
      addTelemetryBreadcrumb("sync", "run_completed", summary);
      trackTelemetryEvent("sync_run_completed", summary);
      if (summary.succeeded > 0 || summary.pulled > 0)
        trackFirstSuccess("sync", { source: "api_sync", result: "success" });
      return summary;
    } catch (error) {
      for (const entry of entries) {
        await store.updateSyncQueueEntry(entry.id, {
          status: "failed",
          errorCode: "transport_error",
          errorMessage:
            error instanceof Error ? error.message : "Sync request failed.",
        });
      }
      captureTelemetryException(error, "api_sync_engine_run", {
        processed: entries.length,
      });
      throw error;
    }
  };
}

async function applyPulledRecords(store: any, remote: Record<string, any[]>) {
  let snapshot = store as any;
  for (const row of remote.groups ?? [])
    await store.upsertGroup(mapRemoteGroupToLocal(row, snapshot));
  snapshot = store;
  for (const row of remote.participants ?? [])
    await store.upsertGroupParticipant(
      mapRemoteGroupParticipantToLocal(row, snapshot),
    );
  for (const row of remote.members ?? [])
    await store.upsertSharedGroupMember(
      mapRemoteGroupMemberToLocal(row, snapshot),
    );
  for (const row of remote.invites ?? [])
    await store.upsertGroupInvite(mapRemoteGroupInviteToLocal(row, snapshot));
  for (const row of remote.expenses ?? []) {
    await store.upsertSharedExpense(
      mapRemoteExpenseToLocal(
        row,
        (remote.splits ?? []).filter(
          (split: any) => split.expense_id === row.id,
        ),
        (remote.payers ?? []).filter(
          (payer: any) => payer.expense_id === row.id,
        ),
        snapshot,
      ),
    );
  }
  for (const row of remote.debts ?? [])
    await store.upsertGroupDebt(mapRemoteGroupDebtToLocal(row, snapshot));
  for (const row of remote.payments ?? [])
    await store.upsertPayment(mapRemotePaymentToLocal(row, snapshot));
  for (const row of remote.settlements ?? [])
    await store.upsertSettlement(mapRemoteSettlementToLocal(row, snapshot));
  for (const row of remote.comments ?? [])
    await store.upsertComment(mapRemoteCommentToLocal(row, snapshot));
  for (const row of remote.attachments ?? [])
    await store.upsertAttachment(mapRemoteAttachmentToLocal(row, snapshot));
  for (const row of remote.activity ?? [])
    await store.upsertGroupActivityLog(mapRemoteActivityToLocal(row, snapshot));
}
