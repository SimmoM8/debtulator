import type { DatabaseSnapshot } from '@/src/data/database';
import type {
  EntityKind,
  SyncConflict,
  SyncQueueEntry,
  SyncStatus,
} from '@/src/types/models';
import { nowIso } from '@/src/utils/id';

const PENDING_STATUSES: SyncStatus[] = ['pending_upload', 'pending_create', 'pending_update', 'pending_delete'];

export type SyncSummary = {
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  runningCount: number;
  localOnlyCount: number;
  remoteDeletedCount: number;
  permissionErrorCount: number;
  lastSyncedAt: string | null;
  statusLabel: string;
  hasBlockingProblems: boolean;
};

export function buildSyncSummary(snapshot: DatabaseSnapshot): SyncSummary {
  const queue = snapshot.syncQueue;
  const syncStatuses = collectSyncStatuses(snapshot);
  const conflictCount =
    snapshot.syncConflicts.filter((conflict) => conflict.status === 'unresolved').length +
    syncStatuses.filter((status) => status === 'conflict').length;
  const failedCount =
    queue.filter((entry) => entry.status === 'failed').length +
    syncStatuses.filter((status) => status === 'sync_error').length;
  const pendingCount =
    queue.filter((entry) => entry.status === 'pending').length +
    syncStatuses.filter((status) => PENDING_STATUSES.includes(status)).length;
  const runningCount = queue.filter((entry) => entry.status === 'running').length;
  const permissionErrorCount = syncStatuses.filter((status) => status === 'permission_error').length;
  const remoteDeletedCount = syncStatuses.filter((status) => status === 'remote_deleted').length;
  const localOnlyCount = syncStatuses.filter((status) => status === 'local_only').length;
  const syncedTimes = queue
    .filter((entry) => entry.status === 'succeeded')
    .map((entry) => entry.updatedAt)
    .sort();
  const hasBlockingProblems = conflictCount > 0 || failedCount > 0 || permissionErrorCount > 0;

  return {
    pendingCount,
    failedCount,
    conflictCount,
    runningCount,
    localOnlyCount,
    remoteDeletedCount,
    permissionErrorCount,
    lastSyncedAt: syncedTimes.at(-1) ?? null,
    statusLabel: hasBlockingProblems
      ? 'Needs review'
      : runningCount > 0
        ? 'Syncing'
        : pendingCount > 0
          ? 'Pending sync'
          : 'Up to date',
    hasBlockingProblems,
  };
}

export function shouldQueueOfflineMutation(input: {
  entityType: EntityKind;
  visibility?: string | null;
  syncStatus?: SyncStatus | null;
  operation: SyncQueueEntry['operation'];
  authenticatedUserId?: string | null;
}) {
  const isShared =
    input.visibility === 'shared' ||
    input.visibility === 'shared_event' ||
    input.visibility === 'shared_with_involved_member';
  const isPrivateBackup = input.visibility === 'private' && input.syncStatus !== 'local_only';
  const canQueue = Boolean(input.authenticatedUserId) && (isShared || isPrivateBackup);
  const unsafeOffline =
    input.operation === 'delete' ||
    input.operation === 'merge' ||
    input.operation === 'verify' ||
    input.operation === 'reject';

  return {
    canQueue: canQueue && !unsafeOffline,
    unsafeOffline,
    reason: !input.authenticatedUserId
      ? 'Sign in before syncing shared changes.'
      : unsafeOffline
        ? 'This action affects shared financial history and needs live permission checks.'
        : null,
  };
}

export function detectVersionConflict(input: {
  localUpdatedAt: string;
  remoteUpdatedAt: string | null;
  baseUpdatedAt?: string | null;
  hasPendingLocalChange: boolean;
}) {
  if (!input.hasPendingLocalChange || !input.remoteUpdatedAt) {
    return false;
  }
  if (!input.baseUpdatedAt) {
    return input.remoteUpdatedAt > input.localUpdatedAt;
  }
  return input.remoteUpdatedAt > input.baseUpdatedAt && input.localUpdatedAt > input.baseUpdatedAt;
}

export function isFinancialConflict(conflict: SyncConflict) {
  return (
    conflict.conflictType === 'payment_conflict' ||
    conflict.conflictType === 'settlement_conflict' ||
    ['debt', 'shared_expense', 'event_debt', 'payment', 'settlement'].includes(conflict.entityType)
  );
}

export function nextRetryAt(entry: SyncQueueEntry) {
  const baseSeconds = Math.min(300, 2 ** Math.min(entry.retryCount, 8));
  const lastAttempt = entry.lastAttemptAt ? new Date(entry.lastAttemptAt).getTime() : Date.now();
  return new Date(lastAttempt + baseSeconds * 1000).toISOString();
}

export function canRetrySyncEntry(entry: SyncQueueEntry, currentTime = nowIso()) {
  if (entry.status !== 'failed') {
    return entry.status === 'pending';
  }
  if (entry.errorCode === 'permission_denied' || entry.errorCode === 'event_locked') {
    return false;
  }
  return nextRetryAt(entry) <= currentTime;
}

function collectSyncStatuses(snapshot: DatabaseSnapshot) {
  return [
    ...snapshot.members.map((item) => item.syncStatus),
    ...snapshot.debts.map((item) => item.syncStatus),
    ...snapshot.events.map((item) => item.syncStatus),
    ...snapshot.eventParticipants.map((item) => item.syncStatus),
    ...snapshot.eventInvites.map((item) => item.syncStatus),
    ...snapshot.sharedEventMembers.map((item) => item.syncStatus),
    ...snapshot.eventMemberClaims.map((item) => item.syncStatus),
    ...snapshot.eventDuplicateWarnings.map((item) => item.syncStatus),
    ...snapshot.sharedExpenses.map((item) => item.syncStatus),
    ...snapshot.eventDebts.map((item) => item.syncStatus),
    ...snapshot.payments.map((item) => item.syncStatus),
    ...snapshot.settlements.map((item) => item.syncStatus),
    ...snapshot.attachments.map((item) => item.syncStatus),
    ...snapshot.comments.map((item) => item.syncStatus),
  ];
}
