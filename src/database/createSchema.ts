import type { SQLiteDatabase } from "expo-sqlite";

export async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY NOT NULL,
      owner_user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS members_owner_id_unique
      ON members(owner_user_id, id);

    CREATE INDEX IF NOT EXISTS members_owner_user_id_idx
      ON members(owner_user_id);

    CREATE INDEX IF NOT EXISTS members_owner_display_name_idx
      ON members(owner_user_id, display_name);

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      owner_user_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      direction TEXT NOT NULL
        CHECK (direction IN ('you_owe', 'they_owe')),
      amount REAL NOT NULL
        CHECK (amount > 0),
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id, member_id)
        REFERENCES members(owner_user_id, id)
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
  `);
}
