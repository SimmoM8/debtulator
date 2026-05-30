import { supabase } from '@/src/services/supabase';

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
