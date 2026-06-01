import type { DatabaseSnapshot } from '@/src/data/database';
import type { AccountDeletionState, AuditLog, SyncConflict } from '@/src/types/models';
import { supabase } from '@/src/services/supabase';

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

export type AccountDeletionStatus =
  | 'requested'
  | 'queued'
  | 'processing'
  | 'anonymized'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AccountDeletionAnonymizationStatus =
  | 'not_started'
  | 'revoking_access'
  | 'deleting_private_data'
  | 'anonymizing_shared_refs'
  | 'awaiting_auth_delete'
  | 'completed'
  | 'failed';

export type AccountDeletionRequest = {
  id: string;
  userId: string | null;
  subjectUserId: string;
  status: AccountDeletionStatus;
  anonymizationStatus: AccountDeletionAnonymizationStatus;
  deleteLocalData: boolean;
  keepLocalArchive: boolean;
  requestedAt: string;
  processingStartedAt: string | null;
  anonymizedAt: string | null;
  authUserDeletedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  updatedAt: string;
};

type AccountDeletionRow = {
  id: string;
  user_id: string | null;
  subject_user_id: string;
  status: AccountDeletionStatus;
  anonymization_status: AccountDeletionAnonymizationStatus;
  delete_local_data: boolean;
  keep_local_archive: boolean;
  requested_at: string;
  processing_started_at: string | null;
  anonymized_at: string | null;
  auth_user_deleted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  failed_at: string | null;
  updated_at: string;
};

export async function fetchLatestAccountDeletionRequest(userId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select(
      'id, user_id, subject_user_id, status, anonymization_status, delete_local_data, keep_local_archive, requested_at, processing_started_at, anonymized_at, auth_user_deleted_at, completed_at, cancelled_at, failed_at, updated_at',
    )
    .eq('subject_user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAccountDeletionRequest(data as AccountDeletionRow) : null;
}

export async function requestRemoteAccountDeletion(input: {
  deleteLocalData: boolean;
  keepLocalArchive: boolean;
  metadata?: Record<string, unknown>;
}) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc('request_account_deletion', {
    p_delete_local_data: input.deleteLocalData,
    p_keep_local_archive: input.keepLocalArchive,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }

  return data ? mapAccountDeletionRequest(data as AccountDeletionRow) : null;
}

function mapAccountDeletionRequest(row: AccountDeletionRow): AccountDeletionRequest {
  return {
    id: row.id,
    userId: row.user_id,
    subjectUserId: row.subject_user_id,
    status: row.status,
    anonymizationStatus: row.anonymization_status,
    deleteLocalData: row.delete_local_data,
    keepLocalArchive: row.keep_local_archive,
    requestedAt: row.requested_at,
    processingStartedAt: row.processing_started_at,
    anonymizedAt: row.anonymized_at,
    authUserDeletedAt: row.auth_user_deleted_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    failedAt: row.failed_at,
    updatedAt: row.updated_at,
  };
}
