import type { SQLiteDatabase } from "expo-sqlite";

import { createSchema } from "./createSchema";

const DATABASE_VERSION = 2;

type UserVersionRow = {
  user_version: number;
};

type LegacyOutboxRow = {
  id: string;
  entity_type: "member" | "debt";
  operation: "upsert" | "delete";
  payload_json: string | null;
};

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<UserVersionRow>("PRAGMA user_version");
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await createSchema(tx);
      await tx.execAsync("PRAGMA user_version = 1");
    });
    version = 1;
  }

  if (version < 2) {
    await migrateToBackendSync(db);
    version = 2;
  }

  if (version > DATABASE_VERSION) {
    throw new Error(
      `Database version ${version} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }
}

async function migrateToBackendSync(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      ALTER TABLE members
        ADD COLUMN linked_user_id TEXT;

      ALTER TABLE members
        ADD COLUMN version INTEGER
        CHECK (version IS NULL OR version >= 0);

      ALTER TABLE debts
        ADD COLUMN version INTEGER
        CHECK (version IS NULL OR version >= 0);

      ALTER TABLE sync_outbox
        ADD COLUMN base_version INTEGER
        CHECK (base_version IS NULL OR base_version >= 0);

      ALTER TABLE sync_outbox
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'conflict', 'rejected'));

      ALTER TABLE sync_outbox
        ADD COLUMN last_error_code TEXT;

      CREATE INDEX sync_outbox_owner_status_created_idx
        ON sync_outbox(owner_user_id, status, created_at);

      CREATE TABLE sync_state_v2 (
        owner_user_id TEXT PRIMARY KEY NOT NULL,
        last_remote_sequence TEXT NOT NULL DEFAULT '0'
          CHECK (
            length(last_remote_sequence) > 0
            AND last_remote_sequence NOT GLOB '*[^0-9]*'
          ),
        bootstrap_completed INTEGER NOT NULL DEFAULT 0
          CHECK (bootstrap_completed IN (0, 1))
      );

      INSERT INTO sync_state_v2 (
        owner_user_id,
        last_remote_sequence,
        bootstrap_completed
      )
      SELECT
        owner_user_id,
        CAST(last_remote_sequence AS TEXT),
        0
      FROM sync_state;

      DROP TABLE sync_state;

      ALTER TABLE sync_state_v2
        RENAME TO sync_state;
    `);

    const rows = await tx.getAllAsync<LegacyOutboxRow>(`
      SELECT
        id,
        entity_type,
        operation,
        payload_json
      FROM sync_outbox
    `);

    for (const row of rows) {
      if (row.operation === "delete") {
        await tx.runAsync(
          `
            UPDATE sync_outbox
            SET
              status = 'rejected',
              last_error_code = 'LEGACY_DELETE_REQUIRES_RECONCILIATION',
              last_error = ?
            WHERE id = ?
          `,
          [
            "This delete was queued before versioned backend sync was introduced and must be recreated after bootstrap.",
            row.id,
          ],
        );
        continue;
      }

      if (!row.payload_json) {
        await rejectLegacyMutation(
          tx,
          row.id,
          "LEGACY_PAYLOAD_INVALID",
          "The queued mutation has no payload.",
        );
        continue;
      }

      try {
        const legacy = JSON.parse(row.payload_json) as Record<string, unknown>;
        const payload =
          row.entity_type === "member"
            ? migrateMemberPayload(legacy)
            : migrateDebtPayload(legacy);

        await tx.runAsync(
          `
            UPDATE sync_outbox
            SET payload_json = ?
            WHERE id = ?
          `,
          [JSON.stringify(payload), row.id],
        );
      } catch {
        await rejectLegacyMutation(
          tx,
          row.id,
          "LEGACY_PAYLOAD_INVALID",
          "The queued mutation could not be converted to the backend sync protocol.",
        );
      }
    }

    await tx.execAsync("PRAGMA user_version = 2");
  });
}

function migrateMemberPayload(
  legacy: Record<string, unknown>,
): Record<string, unknown> {
  return {
    displayName: requireLegacyString(legacy, "display_name"),
    createdAt: requireLegacyString(legacy, "created_at"),
  };
}

function migrateDebtPayload(
  legacy: Record<string, unknown>,
): Record<string, unknown> {
  const amount = legacy.amount;

  if (typeof amount !== "number" && typeof amount !== "string") {
    throw new Error("Invalid legacy amount.");
  }

  return {
    memberId: requireLegacyString(legacy, "member_id"),
    direction: requireLegacyString(legacy, "direction"),
    amount: String(amount),
    currency: requireLegacyString(legacy, "currency"),
    title: requireLegacyString(legacy, "title"),
    dueDate:
      legacy.due_date === null
        ? null
        : requireLegacyString(legacy, "due_date"),
    createdAt: requireLegacyString(legacy, "created_at"),
  };
}

function requireLegacyString(
  value: Record<string, unknown>,
  key: string,
): string {
  const item = value[key];

  if (typeof item !== "string") {
    throw new Error(`Missing legacy field ${key}.`);
  }

  return item;
}

async function rejectLegacyMutation(
  db: SQLiteDatabase,
  id: string,
  code: string,
  message: string,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE sync_outbox
      SET
        status = 'rejected',
        last_error_code = ?,
        last_error = ?
      WHERE id = ?
    `,
    [code, message, id],
  );
}
