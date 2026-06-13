import type {
  ConflictResolution,
  EntityKind,
  SyncConflict,
  SyncQueueEntry,
} from '@/src/types/models';

type ConflictResolutionSnapshot = {
  syncQueue: SyncQueueEntry[];
} & Partial<Record<EntityCollectionName, { id: string }[]>>;

type EntityCollectionName =
  | 'members'
  | 'debts'
  | 'groups'
  | 'sharedExpenses'
  | 'groupInvites'
  | 'sharedGroupMembers'
  | 'groupMemberClaims'
  | 'groupDuplicateWarnings'
  | 'groupDebts'
  | 'groupVerificationResponses'
  | 'payments'
  | 'settlements'
  | 'attachments'
  | 'comments';

export type ConflictResolutionAvailability = Record<ConflictResolution, boolean>;

const APPLY_REMOTE_COLLECTIONS: Partial<Record<EntityKind, EntityCollectionName>> = {
  member: 'members',
  debt: 'debts',
  group: 'groups',
  shared_expense: 'sharedExpenses',
  group_invite: 'groupInvites',
  group_member: 'sharedGroupMembers',
  group_member_claim: 'groupMemberClaims',
  group_duplicate_warning: 'groupDuplicateWarnings',
  group_debt: 'groupDebts',
  group_verification: 'groupVerificationResponses',
  payment: 'payments',
  settlement: 'settlements',
  attachment: 'attachments',
  comment: 'comments',
};

const ACTIVE_QUEUE_STATUSES = new Set<SyncQueueEntry['status']>([
  'pending',
  'running',
  'failed',
  'conflict',
]);

export function getConflictResolutionAvailability(
  conflict: SyncConflict,
  snapshot: ConflictResolutionSnapshot,
): ConflictResolutionAvailability {
  const relatedQueue = getRelatedSyncQueueEntries(snapshot.syncQueue, conflict);
  const hasActiveQueue = relatedQueue.some((entry) => ACTIVE_QUEUE_STATUSES.has(entry.status));

  return {
    keep_mine: hasActiveQueue,
    keep_theirs: canApplyRemoteSnapshot(conflict, snapshot),
    merge: false,
    duplicate: false,
    cancel_local_change: hasActiveQueue,
    archive_local_copy: false,
    manual_edit: false,
  };
}

export function getRelatedSyncQueueEntries(syncQueue: SyncQueueEntry[], conflict: SyncConflict) {
  return syncQueue.filter((entry) => {
    const sameEntity = entry.entityType === conflict.entityType && entry.entityId === conflict.localEntityId;
    const sameConflict = entry.payload.conflictId === conflict.id;
    return sameEntity || sameConflict;
  });
}

export function canApplyRemoteSnapshot(
  conflict: SyncConflict,
  snapshot: Partial<ConflictResolutionSnapshot> = {},
) {
  const collectionName = APPLY_REMOTE_COLLECTIONS[conflict.entityType];
  if (!collectionName) {
    return false;
  }

  const remoteSnapshot = conflict.remoteSnapshot;
  if (remoteSnapshot.id !== conflict.localEntityId) {
    return false;
  }
  if (
    typeof remoteSnapshot.syncStatus !== 'string' ||
    typeof remoteSnapshot.updatedAt !== 'string'
  ) {
    return false;
  }

  if (
    conflict.remoteEntityId &&
    (!('remoteId' in remoteSnapshot) || remoteSnapshot.remoteId !== conflict.remoteEntityId)
  ) {
    return false;
  }

  const existing = snapshot[collectionName];
  if (existing && !existing.some((item) => item.id === conflict.localEntityId)) {
    return false;
  }

  return true;
}
