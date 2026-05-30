import type { DatabaseSnapshot } from '@/src/data/database';
import type { AccountDeletionState, AuditLog, SyncConflict } from '@/src/types/models';

type AccountDeletionPlan = {
  blockers: string[];
  ownedEventCount: number;
  ownedAttachmentCount: number;
  unresolvedOwnedConflictCount: number;
};

export function buildAccountDeletionPlan(snapshot: DatabaseSnapshot, userId: string): AccountDeletionPlan {
  const ownedEventCount = snapshot.events.filter((event) => event.ownerUserId === userId).length;
  const ownedAttachmentCount = snapshot.attachments.filter((attachment) => attachment.createdByUserId === userId).length;
  const unresolvedOwnedConflictCount = snapshot.syncConflicts.filter(
    (conflict) => conflict.status === 'unresolved' && conflictTouchesOwnedData(conflict, snapshot, userId),
  ).length;

  const blockers: string[] = [];
  if (unresolvedOwnedConflictCount > 0) {
    blockers.push('unresolved_owned_conflicts');
  }

  return {
    blockers,
    ownedEventCount,
    ownedAttachmentCount,
    unresolvedOwnedConflictCount,
  };
}

export function getLatestAccountDeletionState(auditLogs: AuditLog[], userId: string): AccountDeletionState | null {
  const accountLogs = auditLogs.filter(
    (log) =>
      log.targetType === 'account' &&
      log.targetId === userId &&
      (log.action === 'account_deletion_requested' ||
        log.action === 'account_deletion_completed' ||
        log.action === 'account_deletion_failed'),
  );

  const requestLogs = accountLogs.filter((log) => log.action === 'account_deletion_requested');
  if (!requestLogs.length) {
    return null;
  }

  const newestRequest = requestLogs.reduce((latest, candidate) =>
    candidate.createdAt > latest.createdAt ? candidate : latest,
  );
  const requestId = typeof newestRequest.metadata.requestId === 'string' ? newestRequest.metadata.requestId : newestRequest.id;

  const outcomeLog = accountLogs
    .filter(
      (log) =>
        (log.action === 'account_deletion_completed' || log.action === 'account_deletion_failed') &&
        log.metadata.requestId === requestId,
    )
    .reduce<AuditLog | null>(
      (latest, candidate) => (latest && latest.createdAt > candidate.createdAt ? latest : candidate),
      null,
    );

  if (!outcomeLog) {
    return {
      requestId,
      userId,
      status: 'pending',
      requestedAt: newestRequest.createdAt,
      processedAt: null,
      failureReason: null,
      metadata: newestRequest.metadata,
    };
  }

  const failureReason =
    outcomeLog.action === 'account_deletion_failed' && typeof outcomeLog.metadata.failureReason === 'string'
      ? outcomeLog.metadata.failureReason
      : null;

  return {
    requestId,
    userId,
    status: outcomeLog.action === 'account_deletion_failed' ? 'failed' : 'completed',
    requestedAt: newestRequest.createdAt,
    processedAt: outcomeLog.createdAt,
    failureReason,
    metadata: outcomeLog.metadata,
  };
}

function conflictTouchesOwnedData(conflict: SyncConflict, snapshot: DatabaseSnapshot, userId: string) {
  if (conflict.entityType === 'event') {
    return snapshot.events.some((event) => event.id === conflict.localEntityId && event.ownerUserId === userId);
  }
  if (conflict.entityType === 'shared_expense') {
    return snapshot.sharedExpenses.some(
      (expense) => expense.id === conflict.localEntityId && expense.creatorUserId === userId,
    );
  }
  if (conflict.entityType === 'event_debt') {
    return snapshot.eventDebts.some((debt) => debt.id === conflict.localEntityId && debt.creatorUserId === userId);
  }
  if (conflict.entityType === 'attachment') {
    return snapshot.attachments.some(
      (attachment) => attachment.id === conflict.localEntityId && attachment.createdByUserId === userId,
    );
  }
  if (conflict.entityType === 'comment') {
    return snapshot.comments.some((comment) => comment.id === conflict.localEntityId && comment.authorUserId === userId);
  }
  return false;
}
