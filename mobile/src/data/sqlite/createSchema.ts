import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Creates the current local schema for a brand-new installation.
 *
 * Existing installations are upgraded exclusively through migrateDatabase.ts.
 * Keeping fresh creation at the current schema avoids replaying historical
 * migrations on every new install.
 */
export async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY NOT NULL,
      owner_user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      linked_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER
        CHECK (version IS NULL OR version >= 0)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS members_owner_id_unique
      ON members(owner_user_id, id);

    CREATE INDEX IF NOT EXISTS members_owner_user_id_idx
      ON members(owner_user_id);

    CREATE INDEX IF NOT EXISTS members_owner_display_name_idx
      ON members(owner_user_id, display_name);

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

    CREATE TABLE IF NOT EXISTS debts (
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

    CREATE INDEX IF NOT EXISTS debts_owner_user_id_idx
      ON debts(owner_user_id);

    CREATE INDEX IF NOT EXISTS debts_member_id_idx
      ON debts(member_id);

    CREATE INDEX IF NOT EXISTS debts_owner_created_at_idx
      ON debts(owner_user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS debts_owner_due_date_idx
      ON debts(owner_user_id, due_date)
      WHERE due_date IS NOT NULL;

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      owner_user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL
        CHECK (entity_type IN ('member', 'debt')),
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL
        CHECK (operation IN ('upsert', 'delete')),
      payload_json TEXT,
      created_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      base_version INTEGER
        CHECK (base_version IS NULL OR base_version >= 0),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'conflict', 'rejected')),
      last_error_code TEXT,
      CHECK (
        (operation = 'upsert' AND payload_json IS NOT NULL)
        OR
        (operation = 'delete' AND payload_json IS NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS sync_outbox_owner_created_idx
      ON sync_outbox(owner_user_id, created_at);

    CREATE INDEX IF NOT EXISTS sync_outbox_owner_status_created_idx
      ON sync_outbox(owner_user_id, status, created_at);

    CREATE TABLE IF NOT EXISTS sync_state (
      owner_user_id TEXT PRIMARY KEY NOT NULL,
      last_remote_sequence TEXT NOT NULL DEFAULT '0'
        CHECK (
          length(last_remote_sequence) > 0
          AND last_remote_sequence NOT GLOB '*[^0-9]*'
        ),
      bootstrap_completed INTEGER NOT NULL DEFAULT 0
        CHECK (bootstrap_completed IN (0, 1))
    );
  `);
}
