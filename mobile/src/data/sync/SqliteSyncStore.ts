import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type {
  LocalSyncMutationStatus,
  SyncEntityType,
  SyncMutation,
  SyncOperation,
} from "./syncTypes";

type SyncMutationRow = {
  id: string;
  owner_user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  base_version: number | null;
  payload_json: string | null;
  created_at: string;
  attempt_count: number;
  status: LocalSyncMutationStatus;
  last_error_code: string | null;
  last_error: string | null;
};

type SyncStateRow = {
  last_remote_sequence: string;
  bootstrap_completed: number;
};

type SyncPayloadRepairRow = {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  base_version: number | null;
  status: LocalSyncMutationStatus;
  payload_json: string;
  attempt_count: number;
  last_error_code: string | null;
  last_error: string | null;
};

export class SqliteSyncStore {
  constructor(private readonly db: SQLiteDatabase) {}

  async enqueue(input: {
    id: string;
    ownerUserId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    baseVersion: number | null;
    payload: unknown | null;
    createdAt: string;
  }): Promise<void> {
    await this.db.runAsync(
      `
        INSERT INTO sync_outbox (
          id,
          owner_user_id,
          entity_type,
          entity_id,
          operation,
          base_version,
          payload_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.ownerUserId,
        input.entityType,
        input.entityId,
        input.operation,
        input.baseVersion,
        input.payload === null ? null : JSON.stringify(input.payload),
        input.createdAt,
      ],
    );
  }

  async getPending(
    ownerUserId: string,
    limit = 100,
  ): Promise<SyncMutation[]> {
    const rows = await this.db.getAllAsync<SyncMutationRow>(
      `
        SELECT
          id,
          owner_user_id,
          entity_type,
          entity_id,
          operation,
          base_version,
          payload_json,
          created_at,
          attempt_count,
          status,
          last_error_code,
          last_error
        FROM sync_outbox
        WHERE owner_user_id = ?
          AND status = 'pending'
        ORDER BY
          CASE
            WHEN operation = 'upsert' AND entity_type = 'member' THEN 1
            WHEN operation = 'upsert' AND entity_type = 'debt' THEN 2
            WHEN operation = 'delete' AND entity_type = 'debt' THEN 3
            WHEN operation = 'delete' AND entity_type = 'member' THEN 4
            ELSE 5
          END,
          created_at ASC,
          id ASC
        LIMIT ?
      `,
      [ownerUserId, limit],
    );

    return rows.map(mapMutationRow);
  }

  async repairNonWritableTimestampPayloads(
    ownerUserId: string,
  ): Promise<void> {
    const rows = await this.db.getAllAsync<SyncPayloadRepairRow>(
      `
        SELECT
          id,
          entity_type,
          entity_id,
          base_version,
          status,
          payload_json,
          attempt_count,
          last_error_code,
          last_error
        FROM sync_outbox
        WHERE owner_user_id = ?
          AND operation = 'upsert'
          AND entity_type IN ('member', 'debt')
          AND payload_json IS NOT NULL
          AND status IN ('pending', 'conflict', 'rejected')
      `,
      [ownerUserId],
    );

    for (const row of rows) {
      let payload: unknown;

      try {
        payload = JSON.parse(row.payload_json);
      } catch {
        continue;
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        continue;
      }

      const writablePayload = {
        ...(payload as Record<string, unknown>),
      };
      let payloadChanged = false;
      let recoverRejected = false;

      if (row.entity_type === "member") {
        if (Object.prototype.hasOwnProperty.call(writablePayload, "createdAt")) {
          delete writablePayload.createdAt;
          payloadChanged = true;
        }

        recoverRejected =
          row.status === "rejected" &&
          row.last_error_code === "INVALID_PAYLOAD" &&
          row.last_error?.includes("createdAt") === true &&
          row.last_error?.includes("not writable") === true;
      } else if (row.base_version === null) {
        const hasValidCreatedAt =
          typeof writablePayload.createdAt === "string" &&
          writablePayload.createdAt.length > 0;

        if (!hasValidCreatedAt) {
          const debt = await this.db.getFirstAsync<{ created_at: string }>(
            `
              SELECT created_at
              FROM debts
              WHERE owner_user_id = ?
                AND id = ?
              LIMIT 1
            `,
            [ownerUserId, row.entity_id],
          );

          if (debt?.created_at) {
            writablePayload.createdAt = debt.created_at;
            payloadChanged = true;
          }
        }

        recoverRejected =
          row.status === "rejected" &&
          row.last_error_code === "INVALID_PAYLOAD" &&
          row.last_error?.includes("createdAt") === true &&
          row.last_error?.includes("must be a string") === true &&
          typeof writablePayload.createdAt === "string";
      }

      const recoverIdempotencyReuse =
        row.status === "rejected" &&
        row.last_error_code === "IDEMPOTENCY_KEY_REUSED";

      if (!payloadChanged && !recoverRejected && !recoverIdempotencyReuse) {
        continue;
      }

      const recover = recoverRejected || recoverIdempotencyReuse;
      const rotateMutationId =
        recover ||
        row.status !== "pending" ||
        row.attempt_count > 0;

      await this.db.runAsync(
        `
          UPDATE sync_outbox
          SET
            id = ?,
            payload_json = ?,
            status = CASE
              WHEN ? = 1 THEN 'pending'
              ELSE status
            END,
            last_error_code = CASE
              WHEN ? = 1 THEN NULL
              ELSE last_error_code
            END,
            last_error = CASE
              WHEN ? = 1 THEN NULL
              ELSE last_error
            END
          WHERE id = ?
        `,
        [
          rotateMutationId ? Crypto.randomUUID() : row.id,
          JSON.stringify(writablePayload),
          recover ? 1 : 0,
          recover ? 1 : 0,
          recover ? 1 : 0,
          row.id,
        ],
      );
    }
  }

  async getBlockingFailures(
    ownerUserId: string,
  ): Promise<SyncMutation[]> {
    const rows = await this.db.getAllAsync<SyncMutationRow>(
      `
        SELECT
          id,
          owner_user_id,
          entity_type,
          entity_id,
          operation,
          base_version,
          payload_json,
          created_at,
          attempt_count,
          status,
          last_error_code,
          last_error
        FROM sync_outbox
        WHERE owner_user_id = ?
          AND status IN ('conflict', 'rejected')
        ORDER BY created_at ASC, id ASC
      `,
      [ownerUserId],
    );

    return rows.map(mapMutationRow);
  }

  async requeueRecoverableMemberConflicts(
    ownerUserId: string,
  ): Promise<void> {
    await this.db.runAsync(
      `
        UPDATE sync_outbox
        SET
          status = 'pending',
          last_error_code = NULL,
          last_error = NULL
        WHERE owner_user_id = ?
          AND status = 'conflict'
          AND entity_type = 'member'
          AND operation = 'upsert'
          AND base_version IS NOT NULL
          AND attempt_count < 3
      `,
      [ownerUserId],
    );
  }

  async hasBlockingFailure(ownerUserId: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM sync_outbox
        WHERE owner_user_id = ?
          AND status IN ('conflict', 'rejected')
      `,
      [ownerUserId],
    );

    return (row?.count ?? 0) > 0;
  }

  async getEntityVersion(
    ownerUserId: string,
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<number | null> {
    const table = entityType === "member" ? "members" : "debts";

    const row = await this.db.getFirstAsync<{ version: number | null }>(
      `
        SELECT version
        FROM ${table}
        WHERE owner_user_id = ?
          AND id = ?
        LIMIT 1
      `,
      [ownerUserId, entityId],
    );

    return row?.version ?? null;
  }

  async updateBaseVersion(id: string, baseVersion: number): Promise<void> {
    await this.db.runAsync(
      `
        UPDATE sync_outbox
        SET base_version = ?
        WHERE id = ?
          AND attempt_count = 0
          AND status = 'pending'
      `,
      [baseVersion, id],
    );
  }

  async markApplied(
    mutation: SyncMutation,
    version: number | null,
  ): Promise<void> {
    if (version !== null) {
      const table = mutation.entityType === "member" ? "members" : "debts";

      await this.db.runAsync(
        `
          UPDATE ${table}
          SET version = ?
          WHERE owner_user_id = ?
            AND id = ?
        `,
        [version, mutation.ownerUserId, mutation.entityId],
      );
    }

    await this.db.runAsync(
      `
        DELETE FROM sync_outbox
        WHERE id = ?
      `,
      [mutation.id],
    );
  }

  async rebaseMemberConflict(
    id: string,
    remoteVersion: number,
    errorCode: string | null,
    error: string,
  ): Promise<void> {
    await this.db.runAsync(
      `
        UPDATE sync_outbox
        SET
          id = ?,
          base_version = ?,
          status = 'pending',
          attempt_count = attempt_count + 1,
          last_error_code = ?,
          last_error = ?
        WHERE id = ?
          AND status = 'pending'
          AND entity_type = 'member'
          AND operation = 'upsert'
      `,
      [Crypto.randomUUID(), remoteVersion, errorCode, error, id],
    );
  }

  async markConflict(
    id: string,
    errorCode: string | null,
    error: string,
  ): Promise<void> {
    await this.markBlocked(id, "conflict", errorCode, error);
  }

  async markRejected(
    id: string,
    errorCode: string | null,
    error: string,
  ): Promise<void> {
    await this.markBlocked(id, "rejected", errorCode, error);
  }

  async markRetry(id: string, error: string): Promise<void> {
    await this.db.runAsync(
      `
        UPDATE sync_outbox
        SET
          attempt_count = attempt_count + 1,
          last_error_code = 'TEMPORARY_FAILURE',
          last_error = ?
        WHERE id = ?
      `,
      [error, id],
    );
  }

  async getLastRemoteSequence(ownerUserId: string): Promise<string> {
    const row = await this.getState(ownerUserId);
    return row?.last_remote_sequence ?? "0";
  }

  async setLastRemoteSequence(
    ownerUserId: string,
    sequence: string,
  ): Promise<void> {
    assertCursor(sequence);

    await this.db.runAsync(
      `
        INSERT INTO sync_state (
          owner_user_id,
          last_remote_sequence,
          bootstrap_completed
        )
        VALUES (?, ?, 1)

        ON CONFLICT(owner_user_id) DO UPDATE SET
          last_remote_sequence = excluded.last_remote_sequence
      `,
      [ownerUserId, sequence],
    );
  }

  async isBootstrapCompleted(ownerUserId: string): Promise<boolean> {
    const row = await this.getState(ownerUserId);
    return row?.bootstrap_completed === 1;
  }

  async completeBootstrap(
    ownerUserId: string,
    cursor: string,
  ): Promise<void> {
    assertCursor(cursor);

    await this.db.runAsync(
      `
        INSERT INTO sync_state (
          owner_user_id,
          last_remote_sequence,
          bootstrap_completed
        )
        VALUES (?, ?, 1)

        ON CONFLICT(owner_user_id) DO UPDATE SET
          last_remote_sequence = excluded.last_remote_sequence,
          bootstrap_completed = 1
      `,
      [ownerUserId, cursor],
    );
  }

  async requireBootstrap(ownerUserId: string): Promise<void> {
    await this.db.runAsync(
      `
        INSERT INTO sync_state (
          owner_user_id,
          last_remote_sequence,
          bootstrap_completed
        )
        VALUES (?, '0', 0)

        ON CONFLICT(owner_user_id) DO UPDATE SET
          bootstrap_completed = 0
      `,
      [ownerUserId],
    );
  }

  private async getState(ownerUserId: string): Promise<SyncStateRow | null> {
    return (
      (await this.db.getFirstAsync<SyncStateRow>(
        `
          SELECT
            last_remote_sequence,
            bootstrap_completed
          FROM sync_state
          WHERE owner_user_id = ?
        `,
        [ownerUserId],
      )) ?? null
    );
  }

  private async markBlocked(
    id: string,
    status: "conflict" | "rejected",
    errorCode: string | null,
    error: string,
  ): Promise<void> {
    await this.db.runAsync(
      `
        UPDATE sync_outbox
        SET
          status = ?,
          attempt_count = attempt_count + 1,
          last_error_code = ?,
          last_error = ?
        WHERE id = ?
      `,
      [status, errorCode, error, id],
    );
  }
}

function mapMutationRow(row: SyncMutationRow): SyncMutation {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    baseVersion: row.base_version,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    status: row.status,
    lastErrorCode: row.last_error_code,
    lastError: row.last_error,
  };
}

function assertCursor(value: string): void {
  if (!/^\d+$/.test(value)) {
    throw new Error("Sync cursor must contain only decimal digits.");
  }
}
