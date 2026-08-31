export type SyncEntityType = "member" | "debt";

export type SyncOperation = "upsert" | "delete";

export type SyncMutation = {
  id: string;
  ownerUserId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payloadJson: string | null;
  createdAt: string;
  attemptCount: number;
  lastError: string | null;
};

export type RemoteSyncChange = {
  sequence: number;
  owner_user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown> | null;
  changed_at: string;
};
