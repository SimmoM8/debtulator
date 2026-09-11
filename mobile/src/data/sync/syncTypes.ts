export type SyncEntityType = "member" | "debt";
export type SyncOperation = "upsert" | "delete";
export type LocalSyncMutationStatus = "pending" | "conflict" | "rejected";
export type RemoteSyncMutationStatus =
  | "applied"
  | "conflict"
  | "rejected"
  | "retry";

export type SyncMutation = {
  id: string;
  ownerUserId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  baseVersion: number | null;
  payloadJson: string | null;
  createdAt: string;
  attemptCount: number;
  status: LocalSyncMutationStatus;
  lastErrorCode: string | null;
  lastError: string | null;
};

export type SyncMutationResult = {
  mutationId: string;
  status: RemoteSyncMutationStatus;
  entityType: SyncEntityType;
  entityId: string;
  version: number | null;
  errorCode: string | null;
  message: string | null;
  replayed: boolean;
};

export type RemoteSyncChange = {
  sequence: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown> | null;
  changedAt: string;
};

export type PullSyncResponse = {
  changes: RemoteSyncChange[];
  nextCursor: string;
  hasMore: boolean;
};

export type BootstrapStartResponse = {
  cursor: string;
  entityTypes: SyncEntityType[];
};

export type SyncBootstrapItem = {
  entityId: string;
  version: number;
  payload: Record<string, unknown>;
};

export type SyncBootstrapPageResponse = {
  entityType: SyncEntityType;
  items: SyncBootstrapItem[];
  nextAfterId: string | null;
  hasMore: boolean;
};
