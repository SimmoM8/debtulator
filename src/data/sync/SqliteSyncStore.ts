import type { SQLiteDatabase } from "expo-sqlite";

import type { SyncEntityType, SyncMutation, SyncOperation } from "./syncTypes";

type SyncMutationRow = {
  id: string;
  owner_user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  payload_json: string | null;
  created_at: string;
  attempt_count: number;
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
          payload_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.ownerUserId,
        input.entityType,
        input.entityId,
        input.operation,
        input.payload === null ? null : JSON.stringify(input.payload),
        input.createdAt,
      ],
    );
  }

  async getPending(ownerUserId: string): Promise<SyncMutation[]> {
    const rows = await this.db.getAllAsync<SyncMutationRow>(
      `
        SELECT
          id,
          owner_user_id,
          entity_type,
          entity_id,
          operation,
          payload_json,
          created_at,
          attempt_count,
          last_error
        FROM sync_outbox
        WHERE owner_user_id = ?
        ORDER BY
          CASE
            WHEN operation = 'upsert' AND entity_type = 'member' THEN 1
            WHEN operation = 'upsert' AND entity_type = 'debt' THEN 2
            WHEN operation = 'delete' AND entity_type = 'debt' THEN 3
            WHEN operation = 'delete' AND entity_type = 'member' THEN 4
            ELSE 5
          END,
          created_at ASC
      `,
      [ownerUserId],
    );

    return rows.map((row) => ({
      id: row.id,
      ownerUserId: row.owner_user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payloadJson: row.payload_json,
      createdAt: row.created_at,
      attemptCount: row.attempt_count,
      lastError: row.last_error,
    }));
  }

  async markCompleted(id: string): Promise<void> {
    await this.db.runAsync(
      `
        DELETE FROM sync_outbox
        WHERE id = ?
      `,
      [id],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db.runAsync(
      `
        UPDATE sync_outbox
        SET
          attempt_count = attempt_count + 1,
          last_error = ?
        WHERE id = ?
      `,
      [error, id],
    );
  }

  async getLastRemoteSequence(ownerUserId: string): Promise<number> {
    const row = await this.db.getFirstAsync<{
      last_remote_sequence: number;
    }>(
      `
        SELECT last_remote_sequence
        FROM sync_state
        WHERE owner_user_id = ?
      `,
      [ownerUserId],
    );

    return row?.last_remote_sequence ?? 0;
  }

  async setLastRemoteSequence(
    ownerUserId: string,
    sequence: number,
  ): Promise<void> {
    await this.db.runAsync(
      `
        INSERT INTO sync_state (
          owner_user_id,
          last_remote_sequence
        )
        VALUES (?, ?)

        ON CONFLICT(owner_user_id) DO UPDATE SET
          last_remote_sequence = excluded.last_remote_sequence
      `,
      [ownerUserId, sequence],
    );
  }
}
