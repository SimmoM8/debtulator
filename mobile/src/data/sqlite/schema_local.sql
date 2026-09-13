-- Debtulator local SQLite schema
-- Effective schema version: 4
--
-- Consolidated end-state represented by migrateDatabase.ts after V1 -> V2 -> V3 -> V4.
-- This is a reference schema only; runtime upgrades must use migrateDatabase.ts.

PRAGMA foreign_keys = ON;

CREATE TABLE members (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  linked_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER CHECK (version IS NULL OR version >= 0)
);

CREATE UNIQUE INDEX members_owner_id_unique
  ON members(owner_user_id, id);
CREATE INDEX members_owner_user_id_idx
  ON members(owner_user_id);
CREATE INDEX members_owner_display_name_idx
  ON members(owner_user_id, display_name);

CREATE TABLE currencies (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER NOT NULL CHECK (decimal_places BETWEEN 0 AND 8),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  display_order INTEGER NOT NULL CHECK (display_order >= 0)
);

CREATE INDEX currencies_enabled_display_order_idx
  ON currencies(enabled, display_order, code);

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  username TEXT,
  name TEXT,
  phone_number TEXT,
  base_currency_code TEXT NOT NULL DEFAULT 'SEK',
  FOREIGN KEY (base_currency_code)
    REFERENCES currencies(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE debts (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('you_owe', 'they_owe')),
  amount TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER CHECK (version IS NULL OR version >= 0),
  FOREIGN KEY (owner_user_id, member_id)
    REFERENCES members(owner_user_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (currency_code)
    REFERENCES currencies(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX debts_owner_user_id_idx
  ON debts(owner_user_id);
CREATE INDEX debts_member_id_idx
  ON debts(member_id);
CREATE INDEX debts_owner_created_at_idx
  ON debts(owner_user_id, created_at DESC);
CREATE INDEX debts_owner_due_date_idx
  ON debts(owner_user_id, due_date)
  WHERE due_date IS NOT NULL;

CREATE TABLE sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('member', 'debt')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  payload_json TEXT,
  created_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  base_version INTEGER CHECK (base_version IS NULL OR base_version >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'conflict', 'rejected')),
  last_error_code TEXT,
  CHECK (
    (operation = 'upsert' AND payload_json IS NOT NULL)
    OR
    (operation = 'delete' AND payload_json IS NULL)
  )
);

CREATE INDEX sync_outbox_owner_created_idx
  ON sync_outbox(owner_user_id, created_at);
CREATE INDEX sync_outbox_owner_status_created_idx
  ON sync_outbox(owner_user_id, status, created_at);

CREATE TABLE sync_state (
  owner_user_id TEXT PRIMARY KEY NOT NULL,
  last_remote_sequence TEXT NOT NULL DEFAULT '0'
    CHECK (
      length(last_remote_sequence) > 0
      AND last_remote_sequence NOT GLOB '*[^0-9]*'
    ),
  bootstrap_completed INTEGER NOT NULL DEFAULT 0
    CHECK (bootstrap_completed IN (0, 1))
);

PRAGMA user_version = 4;
