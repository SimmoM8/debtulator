import type { SQLiteDatabase } from "expo-sqlite";

import { createSchema } from "./createSchema";

const DATABASE_VERSION = 5;

type UserVersionRow = {
  user_version: number;
};

type TableInfoRow = {
  name: string;
};

type LegacyOutboxRow = {
  id: string;
  entity_type: "member" | "debt";
  operation: "upsert" | "delete";
  payload_json: string | null;
};

type LegacyDebtAmountRow = {
  id: string;
  amount: number;
  currency: string;
};

type CurrentDebtCurrencyRow = {
  currency_code: string;
};

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<UserVersionRow>("PRAGMA user_version");
  let version = row?.user_version ?? 0;

  if (version > DATABASE_VERSION) {
    throw new Error(
      `Database version ${version} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }

  /*
   * A genuinely new database is created directly at the current schema.
   * A version-0 database that already contains application tables is treated
   * as legacy/partially initialized and goes through the recovery-safe
   * migrations below instead of being incorrectly marked current.
   */
  if (version === 0 && !(await tableExists(db, "members"))) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await createSchema(tx);
      await tx.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    });

    await assertCurrentSchema(db);
    return;
  }

  if (version < 2) {
    await migrateToBackendSync(db);
    version = 2;
  }

  if (version < 3) {
    await migrateToLocalCurrencyCatalogue(db);
    version = 3;
  }

  if (version < 4) {
    await migrateToAccountProfile(db);
    version = 4;
  }

  if (version < 5) {
    await migrateToDebtAgreementProjection(db);
    version = 5;
  }

  await assertCurrentSchema(db);
}

async function migrateToBackendSync(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    /*
     * user_version can lag behind the physical schema after an interrupted or
     * previously buggy migration. The presence of base_version tells us
     * whether the outbox was already converted to the versioned sync format.
     */
    const outboxWasLegacy = !(await hasColumn(
      tx,
      "sync_outbox",
      "base_version",
    ));

    await addColumnIfMissing(tx, "members", "linked_user_id", "TEXT");

    await addColumnIfMissing(
      tx,
      "members",
      "version",
      "INTEGER CHECK (version IS NULL OR version >= 0)",
    );

    await addColumnIfMissing(
      tx,
      "debts",
      "version",
      "INTEGER CHECK (version IS NULL OR version >= 0)",
    );

    await addColumnIfMissing(
      tx,
      "sync_outbox",
      "base_version",
      "INTEGER CHECK (base_version IS NULL OR base_version >= 0)",
    );

    await addColumnIfMissing(
      tx,
      "sync_outbox",
      "status",
      "TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'conflict', 'rejected'))",
    );

    await addColumnIfMissing(
      tx,
      "sync_outbox",
      "last_error_code",
      "TEXT",
    );

    await tx.execAsync(`
      CREATE INDEX IF NOT EXISTS sync_outbox_owner_status_created_idx
        ON sync_outbox(owner_user_id, status, created_at);
    `);

    if (!(await hasColumn(tx, "sync_state", "bootstrap_completed"))) {
      await tx.execAsync(`
        DROP TABLE IF EXISTS sync_state_v2;

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
    }

    /*
     * Only pre-versioned outboxes need payload conversion/reconciliation.
     * If the physical outbox is already versioned but user_version is stale,
     * leave current mutations untouched.
     */
    if (outboxWasLegacy) {
      const rows = await tx.getAllAsync<LegacyOutboxRow>(`
        SELECT id, entity_type, operation, payload_json
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
          const stored = JSON.parse(row.payload_json) as Record<string, unknown>;
          const payload =
            row.entity_type === "member"
              ? migrateMemberPayload(stored)
              : migrateDebtPayload(stored);

          await tx.runAsync(
            "UPDATE sync_outbox SET payload_json = ? WHERE id = ?",
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
    }

    await tx.execAsync("PRAGMA user_version = 2");
  });
}

async function migrateToLocalCurrencyCatalogue(
  db: SQLiteDatabase,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS currencies (
        code TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        decimal_places INTEGER NOT NULL
          CHECK (decimal_places BETWEEN 0 AND 8),
        enabled INTEGER NOT NULL
          CHECK (enabled IN (0, 1)),
        display_order INTEGER NOT NULL
          CHECK (display_order >= 0)
      );

      INSERT OR IGNORE INTO currencies (
        code,
        name,
        symbol,
        decimal_places,
        enabled,
        display_order
      )
      VALUES
        ('AUD', 'Australian Dollar', 'A$', 2, 1, 10),
        ('EUR', 'Euro', '€', 2, 1, 20),
        ('GBP', 'British Pound', '£', 2, 1, 30),
        ('SEK', 'Swedish Krona', 'kr', 2, 1, 40),
        ('USD', 'US Dollar', '$', 2, 1, 50);

      CREATE INDEX IF NOT EXISTS currencies_enabled_display_order_idx
        ON currencies(enabled, display_order, code);

      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY NOT NULL,
        base_currency_code TEXT NOT NULL DEFAULT 'SEK',
        FOREIGN KEY (base_currency_code)
          REFERENCES currencies(code)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      );
    `);

    if (!(await hasColumn(tx, "debts", "currency_code"))) {
      await migrateLegacyDebtStorage(tx);
    } else {
      /*
       * A previously completed V3 physical migration may exist with a stale
       * user_version. Ensure every referenced currency has a local catalogue
       * row before marking the schema current.
       */
      const currencyRows = await tx.getAllAsync<CurrentDebtCurrencyRow>(`
        SELECT DISTINCT currency_code
        FROM debts
      `);

      for (const row of currencyRows) {
        await ensureCurrencyExists(tx, row.currency_code);
      }

      await createCurrentDebtIndexes(tx);
    }

    await tx.execAsync("PRAGMA user_version = 3");
  });
}

async function migrateToAccountProfile(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await addColumnIfMissing(tx, "profiles", "username", "TEXT");
    await addColumnIfMissing(tx, "profiles", "name", "TEXT");
    await addColumnIfMissing(tx, "profiles", "phone_number", "TEXT");

    await tx.execAsync("PRAGMA user_version = 4");
  });
}

async function migrateToDebtAgreementProjection(
  db: SQLiteDatabase,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await addColumnIfMissing(
      tx,
      "debts",
      "agreement_status",
      "TEXT NOT NULL DEFAULT 'private' CHECK (agreement_status IN ('private', 'pending', 'agreed', 'disagreed'))",
    );
    await addColumnIfMissing(tx, "debts", "collaboration_id", "TEXT");
    await addColumnIfMissing(
      tx,
      "debts",
      "agreed_revision",
      "INTEGER CHECK (agreed_revision IS NULL OR agreed_revision > 0)",
    );
    await tx.execAsync("PRAGMA user_version = 5");
  });
}

async function migrateLegacyDebtStorage(db: SQLiteDatabase): Promise<void> {
  const debtRows = await db.getAllAsync<LegacyDebtAmountRow>(`
    SELECT id, amount, currency
    FROM debts
  `);

  for (const row of debtRows) {
    await ensureCurrencyExists(db, row.currency);
  }

  /*
   * If a prior failed attempt left a staging table behind, the legacy debts
   * table is still the source of truth. Rebuild the staging table cleanly.
   */
  await db.execAsync(`
    DROP TABLE IF EXISTS debts_v3;

    CREATE TABLE debts_v3 (
      id TEXT PRIMARY KEY NOT NULL,
      owner_user_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      direction TEXT NOT NULL
        CHECK (direction IN ('you_owe', 'they_owe')),
      amount TEXT NOT NULL,
      currency_code TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER
        CHECK (version IS NULL OR version >= 0),
      FOREIGN KEY (owner_user_id, member_id)
        REFERENCES members(owner_user_id, id)
        ON DELETE RESTRICT,
      FOREIGN KEY (currency_code)
        REFERENCES currencies(code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );

    INSERT INTO debts_v3 (
      id,
      owner_user_id,
      member_id,
      direction,
      amount,
      currency_code,
      title,
      due_date,
      created_at,
      updated_at,
      version
    )
    SELECT
      id,
      owner_user_id,
      member_id,
      direction,
      '0',
      currency,
      title,
      due_date,
      created_at,
      updated_at,
      version
    FROM debts;
  `);

  for (const row of debtRows) {
    if (!Number.isFinite(row.amount) || row.amount <= 0) {
      throw new Error(`Cannot migrate invalid debt amount for ${row.id}.`);
    }

    await db.runAsync(
      "UPDATE debts_v3 SET amount = ? WHERE id = ?",
      [numberToDecimalString(row.amount), row.id],
    );
  }

  await db.execAsync(`
    DROP TABLE debts;
    ALTER TABLE debts_v3 RENAME TO debts;
  `);

  await createCurrentDebtIndexes(db);
}

async function createCurrentDebtIndexes(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS debts_owner_user_id_idx
      ON debts(owner_user_id);

    CREATE INDEX IF NOT EXISTS debts_member_id_idx
      ON debts(member_id);

    CREATE INDEX IF NOT EXISTS debts_owner_created_at_idx
      ON debts(owner_user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS debts_owner_due_date_idx
      ON debts(owner_user_id, due_date)
      WHERE due_date IS NOT NULL;
  `);
}

async function ensureCurrencyExists(
  db: SQLiteDatabase,
  currencyCode: string,
): Promise<void> {
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(`Cannot migrate invalid currency '${currencyCode}'.`);
  }

  await db.runAsync(
    `
      INSERT OR IGNORE INTO currencies (
        code,
        name,
        symbol,
        decimal_places,
        enabled,
        display_order
      )
      VALUES (?, ?, ?, 8, 0, 2147483647)
    `,
    [currencyCode, currencyCode, currencyCode],
  );
}

function numberToDecimalString(value: number): string {
  return value
    .toFixed(8)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function migrateMemberPayload(
  stored: Record<string, unknown>,
): Record<string, unknown> {
  if (
    typeof stored.displayName === "string" &&
    typeof stored.createdAt === "string"
  ) {
    return {
      displayName: stored.displayName,
      createdAt: stored.createdAt,
    };
  }

  return {
    displayName: requireStoredString(stored, "display_name"),
    createdAt: requireStoredString(stored, "created_at"),
  };
}

function migrateDebtPayload(
  stored: Record<string, unknown>,
): Record<string, unknown> {
  if (
    typeof stored.memberId === "string" &&
    typeof stored.direction === "string" &&
    (typeof stored.amount === "number" || typeof stored.amount === "string") &&
    typeof stored.currency === "string" &&
    typeof stored.title === "string" &&
    typeof stored.createdAt === "string"
  ) {
    return {
      memberId: stored.memberId,
      direction: stored.direction,
      amount: String(stored.amount),
      currency: stored.currency,
      title: stored.title,
      dueDate: requireNullableStoredString(stored.dueDate, "dueDate"),
      createdAt: stored.createdAt,
    };
  }

  const amount = stored.amount;

  if (typeof amount !== "number" && typeof amount !== "string") {
    throw new Error("Invalid legacy amount.");
  }

  return {
    memberId: requireStoredString(stored, "member_id"),
    direction: requireStoredString(stored, "direction"),
    amount: String(amount),
    currency: requireStoredString(stored, "currency"),
    title: requireStoredString(stored, "title"),
    dueDate: requireNullableStoredString(stored.due_date, "due_date"),
    createdAt: requireStoredString(stored, "created_at"),
  };
}

function requireNullableStoredString(
  value: unknown,
  key: string,
): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid stored field ${key}.`);
  }

  return value;
}

function requireStoredString(
  value: Record<string, unknown>,
  key: string,
): string {
  const item = value[key];

  if (typeof item !== "string") {
    throw new Error(`Missing stored field ${key}.`);
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

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (await hasColumn(db, table, column)) {
    return;
  }

  assertIdentifier(table);
  assertIdentifier(column);

  await db.execAsync(
    `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
  );
}

async function hasColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  assertIdentifier(table);
  const rows = await db.getAllAsync<TableInfoRow>(
    `PRAGMA table_info(${table})`,
  );

  return rows.some((row) => row.name === column);
}

async function tableExists(
  db: SQLiteDatabase,
  table: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?
      LIMIT 1
    `,
    [table],
  );

  return row !== null;
}

async function assertCurrentSchema(db: SQLiteDatabase): Promise<void> {
  const requiredColumns: Readonly<Record<string, readonly string[]>> = {
    members: [
      "id",
      "owner_user_id",
      "display_name",
      "linked_user_id",
      "created_at",
      "updated_at",
      "version",
    ],
    currencies: [
      "code",
      "name",
      "symbol",
      "decimal_places",
      "enabled",
      "display_order",
    ],
    profiles: [
      "user_id",
      "username",
      "name",
      "phone_number",
      "base_currency_code",
    ],
    debts: [
      "id",
      "owner_user_id",
      "member_id",
      "direction",
      "amount",
      "currency_code",
      "title",
      "due_date",
      "created_at",
      "updated_at",
      "agreement_status",
      "collaboration_id",
      "agreed_revision",
      "version",
    ],
    sync_outbox: [
      "id",
      "owner_user_id",
      "entity_type",
      "entity_id",
      "operation",
      "payload_json",
      "created_at",
      "attempt_count",
      "last_error",
      "base_version",
      "status",
      "last_error_code",
    ],
    sync_state: [
      "owner_user_id",
      "last_remote_sequence",
      "bootstrap_completed",
    ],
  };

  for (const [table, columns] of Object.entries(requiredColumns)) {
    if (!(await tableExists(db, table))) {
      throw new Error(
        `Local database migration is incomplete: missing table '${table}'.`,
      );
    }

    for (const column of columns) {
      if (!(await hasColumn(db, table, column))) {
        throw new Error(
          `Local database migration is incomplete: missing column '${table}.${column}'.`,
        );
      }
    }
  }

  const row = await db.getFirstAsync<UserVersionRow>("PRAGMA user_version");

  if ((row?.user_version ?? 0) !== DATABASE_VERSION) {
    throw new Error(
      `Local database migration is incomplete: expected version ${DATABASE_VERSION}.`,
    );
  }
}

function assertIdentifier(value: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQLite identifier '${value}'.`);
  }
}
