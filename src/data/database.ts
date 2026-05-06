import * as SQLite from 'expo-sqlite';

import { DEFAULT_BASE_CURRENCY, DEFAULT_CURRENCY_RATES_TO_SEK } from '@/src/constants/currencies';
import type {
  AppSettings,
  ActivityLog,
  ActivityTargetKind,
  CurrencyCode,
  CurrencyRate,
  Debt,
  DebtVerification,
  Event,
  EventActivityLog,
  EventDebt,
  EventDuplicateWarning,
  EventInvite,
  EventMember,
  EventMemberClaim,
  EventParticipant,
  EventStatus,
  EventVerificationResponse,
  LinkRequest,
  Member,
  SharedEventMember,
  SharedExpense,
  SyncStatus,
  Tag,
  UserProfile,
  VerificationStatus,
} from '@/src/types/models';
import { createId, nowIso, todayIsoDate } from '@/src/utils/id';
import { parseJsonArray, parseJsonObject, toJson } from '@/src/utils/json';
import { withGeneratedObligations } from '@/src/services/splits';

export type DatabaseSnapshot = {
  profiles: UserProfile[];
  members: Member[];
  debts: Debt[];
  events: Event[];
  eventMembers: EventMember[];
  eventParticipants: EventParticipant[];
  eventInvites: EventInvite[];
  sharedEventMembers: SharedEventMember[];
  eventMemberClaims: EventMemberClaim[];
  eventDuplicateWarnings: EventDuplicateWarning[];
  sharedExpenses: SharedExpense[];
  eventDebts: EventDebt[];
  eventVerificationResponses: EventVerificationResponse[];
  eventActivityLogs: EventActivityLog[];
  linkRequests: LinkRequest[];
  debtVerifications: DebtVerification[];
  activityLogs: ActivityLog[];
  tags: Tag[];
  currencyRates: CurrencyRate[];
  settings: AppSettings;
};

type MemberRow = {
  id: string;
  display_name: string;
  notes: string | null;
  email: string | null;
  phone: string | null;
  remote_id: string | null;
  linked_user_id: string | null;
  link_status: Member['linkStatus'] | null;
  link_request_id: string | null;
  linked_profile_display_name: string | null;
  linked_profile_email: string | null;
  linked_profile_phone: string | null;
  sync_status: SyncStatus | null;
  tags_json: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
};

type DebtRow = {
  id: string;
  member_id: string;
  remote_id: string | null;
  verification_request_id: string | null;
  visibility: Debt['visibility'] | null;
  sync_status: SyncStatus | null;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  shared_notes: string | null;
  debt_date: string;
  due_date: string | null;
  tags_json: string | null;
  event_id: string | null;
  status: Debt['status'];
  verification_status: VerificationStatus;
  verified_by_user_id: string | null;
  verified_at: string | null;
  rejected_by_user_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  dispute_reason: string | null;
  resolution_note: string | null;
  suggested_change_json: string | null;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  local_id: string | null;
  remote_id: string | null;
  owner_user_id: string | null;
  name: string;
  notes: string | null;
  default_currency: CurrencyCode;
  allowed_currencies_json: string | null;
  tags_json: string | null;
  status: EventStatus;
  visibility: Event['visibility'] | null;
  sync_status: SyncStatus | null;
  archived: number;
  archived_at: string | null;
  finalised_at: string | null;
  locked_at: string | null;
  ignored_duplicate_keys_json: string | null;
  created_at: string;
  updated_at: string;
};

type EventMemberRow = {
  event_id: string;
  member_id: string;
  created_at: string;
};

type EventParticipantRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  user_id: string;
  role: EventParticipant['role'];
  status: EventParticipant['status'];
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type EventInviteRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  inviter_user_id: string;
  invited_user_id: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  invited_display_name: string;
  offered_role: EventInvite['offeredRole'];
  status: EventInvite['status'];
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  sync_status: SyncStatus | null;
};

type SharedEventMemberRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  type: SharedEventMember['type'];
  linked_user_id: string | null;
  display_name: string;
  alias: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  status: SharedEventMember['status'];
  merged_into_event_member_id: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type EventMemberClaimRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  event_member_id: string;
  remote_event_member_id: string | null;
  claimant_user_id: string;
  status: EventMemberClaim['status'];
  message: string | null;
  responded_by_user_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type EventDuplicateWarningRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  event_member_id_a: string;
  event_member_id_b: string;
  reason: string;
  confidence: EventDuplicateWarning['confidence'];
  status: EventDuplicateWarning['status'];
  ignored_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type SharedExpenseRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  creator_user_id: string | null;
  payer_id: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  expense_date: string;
  participant_ids_json: string | null;
  split_method: SharedExpense['splitMethod'];
  generated_obligations_json: string | null;
  tags_json: string | null;
  status: Debt['status'];
  verification_status: VerificationStatus;
  visibility: SharedExpense['visibility'] | null;
  sync_status: SyncStatus | null;
  created_at: string;
  updated_at: string;
};

type EventDebtRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  creator_user_id: string | null;
  debtor_event_member_id: string;
  creditor_event_member_id: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  debt_date: string;
  tags_json: string | null;
  verification_status: EventDebt['verificationStatus'];
  settlement_status: EventDebt['settlementStatus'];
  status: EventDebt['status'];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  sync_status: SyncStatus | null;
};

type EventVerificationResponseRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  target_type: EventVerificationResponse['targetType'];
  target_id: string;
  remote_target_id: string | null;
  event_member_id: string;
  linked_user_id: string | null;
  response_status: EventVerificationResponse['responseStatus'];
  rejection_reason: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type EventActivityLogRow = {
  id: string;
  remote_id: string | null;
  event_id: string;
  remote_event_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata_json: string | null;
  created_at: string;
  sync_status: SyncStatus | null;
};

type TagRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

type RateRow = {
  currency: CurrencyCode;
  rate_to_sek: number;
  updated_at: string;
};

type SettingRow = {
  key: string;
  value: string;
};

type UserProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  base_currency: CurrencyCode;
  created_at: string;
  updated_at: string;
};

type LinkRequestRow = {
  id: string;
  remote_id: string | null;
  requester_user_id: string;
  target_user_id: string | null;
  target_email: string | null;
  target_phone: string | null;
  requester_member_id: string;
  requester_label: string;
  status: LinkRequest['status'];
  message: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type DebtVerificationRow = {
  id: string;
  remote_id: string | null;
  debt_id: string;
  remote_debt_id: string | null;
  requester_user_id: string;
  responder_user_id: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  suggested_change_json: string | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

type ActivityLogRow = {
  id: string;
  entity_kind: ActivityTargetKind;
  entity_id: string;
  actor_user_id: string | null;
  action: string;
  metadata_json: string | null;
  created_at: string;
};

const DB_NAME = 'debtulator-stage1.db';

export async function openDebtulatorDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrate(db);
  await seedIfEmpty(db);
  return db;
}

export async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      notes TEXT,
      email TEXT,
      phone TEXT,
      remote_id TEXT,
      linked_user_id TEXT,
      link_status TEXT NOT NULL DEFAULT 'unlinked',
      link_request_id TEXT,
      linked_profile_display_name TEXT,
      linked_profile_email TEXT,
      linked_profile_phone TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      tags_json TEXT NOT NULL DEFAULT '[]',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      local_id TEXT,
      remote_id TEXT,
      owner_user_id TEXT,
      name TEXT NOT NULL,
      notes TEXT,
      default_currency TEXT NOT NULL,
      allowed_currencies_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      archived INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      finalised_at TEXT,
      locked_at TEXT,
      ignored_duplicate_keys_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (event_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      joined_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS event_participants_event_user_unique
      ON event_participants(event_id, user_id);

    CREATE TABLE IF NOT EXISTS event_invites (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      inviter_user_id TEXT NOT NULL,
      invited_user_id TEXT,
      invited_email TEXT,
      invited_phone TEXT,
      invited_display_name TEXT NOT NULL,
      offered_role TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      responded_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS shared_event_members (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      type TEXT NOT NULL,
      linked_user_id TEXT,
      display_name TEXT NOT NULL,
      alias TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_by_user_id TEXT,
      status TEXT NOT NULL,
      merged_into_event_member_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS shared_event_members_linked_unique
      ON shared_event_members(event_id, linked_user_id)
      WHERE linked_user_id IS NOT NULL AND status != 'merged';

    CREATE TABLE IF NOT EXISTS event_member_claims (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      event_member_id TEXT NOT NULL,
      remote_event_member_id TEXT,
      claimant_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      responded_by_user_id TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS event_duplicate_warnings (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      event_member_id_a TEXT NOT NULL,
      event_member_id_b TEXT NOT NULL,
      reason TEXT NOT NULL,
      confidence TEXT NOT NULL,
      status TEXT NOT NULL,
      ignored_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS event_duplicate_warning_pair_unique
      ON event_duplicate_warnings(event_id, event_member_id_a, event_member_id_b, reason);

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      member_id TEXT NOT NULL,
      remote_id TEXT,
      verification_request_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      direction TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      shared_notes TEXT,
      debt_date TEXT NOT NULL,
      due_date TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      event_id TEXT,
      status TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      verified_by_user_id TEXT,
      verified_at TEXT,
      rejected_by_user_id TEXT,
      rejected_at TEXT,
      rejection_reason TEXT,
      dispute_reason TEXT,
      resolution_note TEXT,
      suggested_change_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shared_expenses (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      creator_user_id TEXT,
      payer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      expense_date TEXT NOT NULL,
      participant_ids_json TEXT NOT NULL DEFAULT '[]',
      split_method TEXT NOT NULL,
      generated_obligations_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_debts (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      creator_user_id TEXT,
      debtor_event_member_id TEXT NOT NULL,
      creditor_event_member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      debt_date TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      verification_status TEXT NOT NULL,
      settlement_status TEXT NOT NULL DEFAULT 'active',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS event_verification_responses (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      remote_target_id TEXT,
      event_member_id TEXT NOT NULL,
      linked_user_id TEXT,
      response_status TEXT NOT NULL,
      rejection_reason TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS event_verification_response_unique
      ON event_verification_responses(event_id, target_type, target_id, event_member_id);

    CREATE TABLE IF NOT EXISTS event_activity_logs (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      event_id TEXT NOT NULL,
      remote_event_id TEXT,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar_url TEXT,
      base_currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS link_requests (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      requester_user_id TEXT NOT NULL,
      target_user_id TEXT,
      target_email TEXT,
      target_phone TEXT,
      requester_member_id TEXT NOT NULL,
      requester_label TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS debt_verifications (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      debt_id TEXT NOT NULL,
      remote_debt_id TEXT,
      requester_user_id TEXT NOT NULL,
      responder_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      rejection_reason TEXT,
      suggested_change_json TEXT,
      requested_at TEXT NOT NULL,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY NOT NULL,
      entity_kind TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS currency_rates (
      currency TEXT PRIMARY KEY NOT NULL,
      rate_to_sek REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await ensureColumn(db, 'members', 'remote_id', 'TEXT');
  await ensureColumn(db, 'members', 'linked_user_id', 'TEXT');
  await ensureColumn(db, 'members', 'link_status', "TEXT NOT NULL DEFAULT 'unlinked'");
  await ensureColumn(db, 'members', 'link_request_id', 'TEXT');
  await ensureColumn(db, 'members', 'linked_profile_display_name', 'TEXT');
  await ensureColumn(db, 'members', 'linked_profile_email', 'TEXT');
  await ensureColumn(db, 'members', 'linked_profile_phone', 'TEXT');
  await ensureColumn(db, 'members', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");

  await ensureColumn(db, 'events', 'local_id', 'TEXT');
  await ensureColumn(db, 'events', 'remote_id', 'TEXT');
  await ensureColumn(db, 'events', 'owner_user_id', 'TEXT');
  await ensureColumn(db, 'events', 'allowed_currencies_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'events', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'events', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");
  await ensureColumn(db, 'events', 'archived_at', 'TEXT');
  await ensureColumn(db, 'events', 'finalised_at', 'TEXT');
  await ensureColumn(db, 'events', 'locked_at', 'TEXT');

  await ensureColumn(db, 'debts', 'remote_id', 'TEXT');
  await ensureColumn(db, 'debts', 'verification_request_id', 'TEXT');
  await ensureColumn(db, 'debts', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'debts', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");
  await ensureColumn(db, 'debts', 'shared_notes', 'TEXT');
  await ensureColumn(db, 'debts', 'verified_by_user_id', 'TEXT');
  await ensureColumn(db, 'debts', 'verified_at', 'TEXT');
  await ensureColumn(db, 'debts', 'rejected_by_user_id', 'TEXT');
  await ensureColumn(db, 'debts', 'rejected_at', 'TEXT');
  await ensureColumn(db, 'debts', 'rejection_reason', 'TEXT');
  await ensureColumn(db, 'debts', 'dispute_reason', 'TEXT');
  await ensureColumn(db, 'debts', 'resolution_note', 'TEXT');
  await ensureColumn(db, 'debts', 'suggested_change_json', 'TEXT');

  await ensureColumn(db, 'shared_expenses', 'remote_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'creator_user_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'shared_expenses', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");

  await ensureColumn(db, 'activity_log', 'actor_user_id', 'TEXT');
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export async function resetDatabase(db: SQLite.SQLiteDatabase, seed = true) {
  await db.execAsync(`
    DELETE FROM event_activity_logs;
    DELETE FROM event_verification_responses;
    DELETE FROM event_debts;
    DELETE FROM event_duplicate_warnings;
    DELETE FROM event_member_claims;
    DELETE FROM shared_event_members;
    DELETE FROM event_invites;
    DELETE FROM event_participants;
    DELETE FROM activity_log;
    DELETE FROM debt_verifications;
    DELETE FROM link_requests;
    DELETE FROM user_profiles;
    DELETE FROM shared_expenses;
    DELETE FROM debts;
    DELETE FROM event_members;
    DELETE FROM events;
    DELETE FROM members;
    DELETE FROM tags;
    DELETE FROM currency_rates;
    DELETE FROM app_settings;
  `);

  if (seed) {
    await seedDemoData(db);
  } else {
    await seedDefaults(db);
  }
}

export async function seedIfEmpty(db: SQLite.SQLiteDatabase) {
  await seedDefaults(db);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT
      (SELECT COUNT(*) FROM members) +
      (SELECT COUNT(*) FROM debts) +
      (SELECT COUNT(*) FROM events) +
      (SELECT COUNT(*) FROM shared_expenses) AS count`,
  );

  if ((row?.count ?? 0) === 0) {
    await seedDemoData(db);
  }
}

export async function seedDefaults(db: SQLite.SQLiteDatabase) {
  const timestamp = nowIso();
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [
    'baseCurrency',
    DEFAULT_BASE_CURRENCY,
  ]);
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [
    'showEstimatedBase',
    'true',
  ]);
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [
    'theme',
    'system',
  ]);

  for (const [currency, rate] of Object.entries(DEFAULT_CURRENCY_RATES_TO_SEK)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO currency_rates (currency, rate_to_sek, updated_at) VALUES (?, ?, ?)`,
      [currency, rate, timestamp],
    );
  }
}

export async function seedDemoData(db: SQLite.SQLiteDatabase) {
  const timestamp = nowIso();
  const members: Member[] = [
    {
      id: 'member_dad',
      displayName: 'Dad',
      notes: 'Family ledger contact. Phone kept as a future linking placeholder.',
      email: 'dad@example.com',
      phone: '+46700000001',
      remoteId: null,
      linkedUserId: null,
      linkStatus: 'unlinked',
      linkRequestId: null,
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: 'local_only',
      tags: ['Family'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_ben_dad',
      displayName: "Benjamin's Dad",
      notes: 'Possible duplicate demo member for Stage 1 warnings.',
      email: null,
      phone: '+46700000001',
      remoteId: null,
      linkedUserId: null,
      linkStatus: 'unlinked',
      linkRequestId: null,
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: 'local_only',
      tags: ['Family'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_daniel',
      displayName: 'Daniel',
      notes: 'Housemate and regular trip organiser.',
      email: 'daniel@example.com',
      phone: null,
      remoteId: null,
      linkedUserId: 'demo_user_daniel',
      linkStatus: 'linked',
      linkRequestId: null,
      linkedProfileDisplayName: 'Daniel Andersson',
      linkedProfileEmail: 'daniel@example.com',
      linkedProfilePhone: null,
      syncStatus: 'synced',
      tags: ['Friends', 'Apartment'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_sarah',
      displayName: 'Sarah',
      notes: 'Often pays shared groceries.',
      email: 'sarah@example.com',
      phone: null,
      remoteId: null,
      linkedUserId: null,
      linkStatus: 'invite_pending',
      linkRequestId: 'link_demo_sarah',
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: 'pending_upload',
      tags: ['Friends', 'Food'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'member_emma',
      displayName: 'Emma',
      notes: 'Travel friend.',
      email: 'emma@example.com',
      phone: null,
      remoteId: null,
      linkedUserId: null,
      linkStatus: 'link_rejected',
      linkRequestId: 'link_demo_emma',
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: 'synced',
      tags: ['Friends', 'Travel'],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const events: Event[] = [
    {
      id: 'event_ski_sweden',
      localId: null,
      remoteId: 'remote_event_ski_sweden',
      ownerUserId: 'demo_user_local',
      name: 'Ski Trip Sweden',
      notes: 'Cabin, groceries, fuel, and rentals.',
      defaultCurrency: 'SEK',
      allowedCurrencies: ['SEK', 'EUR', 'GBP'],
      tags: ['Travel', 'Food'],
      status: 'active',
      visibility: 'shared',
      syncStatus: 'synced',
      archived: false,
      archivedAt: null,
      finalisedAt: null,
      lockedAt: null,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'event_christmas',
      localId: null,
      remoteId: null,
      ownerUserId: null,
      name: 'Christmas 2025',
      notes: 'Gifts and family dinner planning.',
      defaultCurrency: 'SEK',
      allowedCurrencies: ['SEK'],
      tags: ['Family', 'Gift', 'Christmas 2025'],
      status: 'planning',
      visibility: 'private',
      syncStatus: 'local_only',
      archived: false,
      archivedAt: null,
      finalisedAt: null,
      lockedAt: null,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'event_apartment',
      localId: null,
      remoteId: null,
      ownerUserId: null,
      name: 'Apartment expenses',
      notes: 'Utilities and shared household supplies.',
      defaultCurrency: 'USD',
      allowedCurrencies: ['USD'],
      tags: ['Apartment', 'Rent'],
      status: 'active',
      visibility: 'private',
      syncStatus: 'local_only',
      archived: false,
      archivedAt: null,
      finalisedAt: null,
      lockedAt: null,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const eventMembers: EventMember[] = [
    { eventId: 'event_ski_sweden', memberId: 'member_daniel', createdAt: timestamp },
    { eventId: 'event_ski_sweden', memberId: 'member_sarah', createdAt: timestamp },
    { eventId: 'event_ski_sweden', memberId: 'member_emma', createdAt: timestamp },
    { eventId: 'event_christmas', memberId: 'member_dad', createdAt: timestamp },
    { eventId: 'event_christmas', memberId: 'member_ben_dad', createdAt: timestamp },
    { eventId: 'event_apartment', memberId: 'member_daniel', createdAt: timestamp },
    { eventId: 'event_apartment', memberId: 'member_sarah', createdAt: timestamp },
  ];

  const eventParticipants: EventParticipant[] = [
    {
      id: 'participant_ski_owner',
      remoteId: 'remote_participant_ski_owner',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      userId: 'demo_user_local',
      role: 'owner',
      status: 'active',
      joinedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'participant_ski_daniel',
      remoteId: 'remote_participant_ski_daniel',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      userId: 'demo_user_daniel',
      role: 'admin',
      status: 'active',
      joinedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'participant_ski_emma',
      remoteId: 'remote_participant_ski_emma',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      userId: 'demo_user_emma',
      role: 'member',
      status: 'active',
      joinedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  const eventInvites: EventInvite[] = [
    {
      id: 'invite_ski_sarah',
      remoteId: 'remote_invite_ski_sarah',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      inviterUserId: 'demo_user_local',
      invitedUserId: 'demo_user_sarah',
      invitedEmail: 'sarah@example.com',
      invitedPhone: null,
      invitedDisplayName: 'Sarah',
      offeredRole: 'member',
      status: 'pending',
      message: 'Join the Ski Trip shared ledger.',
      createdAt: timestamp,
      updatedAt: timestamp,
      respondedAt: null,
      syncStatus: 'synced',
    },
  ];

  const sharedEventMembers: SharedEventMember[] = [
    {
      id: 'event_member_ski_benjamin',
      remoteId: 'remote_event_member_ski_benjamin',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      type: 'linked_user',
      linkedUserId: 'demo_user_local',
      displayName: 'Benjamin',
      alias: 'You',
      email: 'benjamin@example.com',
      phone: null,
      notes: null,
      createdByUserId: 'demo_user_local',
      status: 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'event_member_ski_daniel',
      remoteId: 'remote_event_member_ski_daniel',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      type: 'linked_user',
      linkedUserId: 'demo_user_daniel',
      displayName: 'Daniel',
      alias: null,
      email: 'daniel@example.com',
      phone: null,
      notes: null,
      createdByUserId: 'demo_user_local',
      status: 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'event_member_ski_sarah',
      remoteId: 'remote_event_member_ski_sarah',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      type: 'unlinked_placeholder',
      linkedUserId: null,
      displayName: 'Sarah',
      alias: null,
      email: 'sarah@example.com',
      phone: null,
      notes: 'Shared placeholder until Sarah accepts and claims it.',
      createdByUserId: 'demo_user_local',
      status: 'claim_pending',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'event_member_ski_emma',
      remoteId: 'remote_event_member_ski_emma',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      type: 'linked_user',
      linkedUserId: 'demo_user_emma',
      displayName: 'Emma',
      alias: null,
      email: 'emma@example.com',
      phone: null,
      notes: null,
      createdByUserId: 'demo_user_local',
      status: 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'event_member_ski_dad',
      remoteId: 'remote_event_member_ski_dad',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      type: 'unlinked_placeholder',
      linkedUserId: null,
      displayName: 'Dad',
      alias: null,
      email: null,
      phone: '+46700000001',
      notes: null,
      createdByUserId: 'demo_user_local',
      status: 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'event_member_ski_bens_dad',
      remoteId: 'remote_event_member_ski_bens_dad',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      type: 'unlinked_placeholder',
      linkedUserId: null,
      displayName: "Benjamin's Dad",
      alias: null,
      email: null,
      phone: '+46700000001',
      notes: 'Duplicate-warning demo placeholder.',
      createdByUserId: 'demo_user_daniel',
      status: 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  const eventMemberClaims: EventMemberClaim[] = [
    {
      id: 'claim_ski_sarah',
      remoteId: 'remote_claim_ski_sarah',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      eventMemberId: 'event_member_ski_sarah',
      remoteEventMemberId: 'remote_event_member_ski_sarah',
      claimantUserId: 'demo_user_sarah',
      status: 'pending',
      message: 'This is me.',
      respondedByUserId: null,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  const eventDuplicateWarnings: EventDuplicateWarning[] = [
    {
      id: 'duplicate_ski_dad',
      remoteId: 'remote_duplicate_ski_dad',
      eventId: 'event_ski_sweden',
      eventMemberIdA: 'event_member_ski_dad',
      eventMemberIdB: 'event_member_ski_bens_dad',
      reason: 'Same phone number; names are also very similar.',
      confidence: 'high',
      status: 'active',
      ignoredByUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  const debts: Debt[] = [
    {
      id: 'debt_dad_gift',
      type: 'simple',
      memberId: 'member_dad',
      remoteId: null,
      verificationRequestId: null,
      visibility: 'private',
      syncStatus: 'local_only',
      direction: 'they_owe_me',
      amount: 250,
      currency: 'SEK',
      title: 'Christmas gift balance',
      notes: 'Dad asked me to buy the joint gift first.',
      sharedNotes: null,
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Family', 'Gift'],
      eventId: 'event_christmas',
      status: 'active',
      verificationStatus: 'local_only',
      verifiedByUserId: null,
      verifiedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'debt_daniel_backpack',
      type: 'simple',
      memberId: 'member_daniel',
      remoteId: 'remote_debt_demo_daniel_backpack',
      verificationRequestId: 'verify_demo_daniel_backpack',
      visibility: 'shared_with_involved_member',
      syncStatus: 'synced',
      direction: 'i_owe_them',
      amount: 50,
      currency: 'AUD',
      title: 'Borrowed backpack',
      notes: 'Bought while Daniel was in Sydney.',
      sharedNotes: 'Bought while Daniel was in Sydney.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Travel'],
      eventId: null,
      status: 'active',
      verificationStatus: 'verified',
      verifiedByUserId: 'demo_user_daniel',
      verifiedAt: timestamp,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'debt_sarah_dinner',
      type: 'simple',
      memberId: 'member_sarah',
      remoteId: 'remote_debt_demo_sarah_dinner',
      verificationRequestId: 'verify_demo_sarah_dinner',
      visibility: 'shared_with_involved_member',
      syncStatus: 'pending_upload',
      direction: 'they_owe_me',
      amount: 42,
      currency: 'EUR',
      title: 'Dinner booking deposit',
      notes: 'Deposit covered before the trip.',
      sharedNotes: 'Deposit covered before the trip.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Food', 'Travel'],
      eventId: null,
      status: 'active',
      verificationStatus: 'pending',
      verifiedByUserId: null,
      verifiedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'debt_emma_rejected',
      type: 'simple',
      memberId: 'member_emma',
      remoteId: 'remote_debt_demo_emma_rejected',
      verificationRequestId: 'verify_demo_emma_rejected',
      visibility: 'shared_with_involved_member',
      syncStatus: 'synced',
      direction: 'they_owe_me',
      amount: 85,
      currency: 'GBP',
      title: 'Train change fee',
      notes: 'Rejected locally in this demo; kept in the private ledger.',
      sharedNotes: 'Train change fee after the cabin plan changed.',
      debtDate: todayIsoDate(),
      dueDate: null,
      tags: ['Travel'],
      eventId: 'event_ski_sweden',
      status: 'active',
      verificationStatus: 'rejected',
      verifiedByUserId: null,
      verifiedAt: null,
      rejectedByUserId: 'demo_user_emma',
      rejectedAt: timestamp,
      rejectionReason: 'I paid my own change fee at the station.',
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: { amount: 40, currency: 'GBP', reason: 'Only the flexible-ticket fee was shared.' },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const sharedExpenses: SharedExpense[] = [
    withGeneratedObligations({
      id: 'expense_ski_groceries',
      remoteId: null,
      eventId: 'event_ski_sweden',
      creatorUserId: 'demo_user_local',
      payerId: 'event_member_ski_benjamin',
      amount: 1200,
      currency: 'SEK',
      title: 'Cabin groceries',
      notes: 'You paid. Split between everyone in the cabin.',
      expenseDate: todayIsoDate(),
      participantIds: [
        'event_member_ski_benjamin',
        'event_member_ski_daniel',
        'event_member_ski_sarah',
        'event_member_ski_emma',
      ],
      splitMethod: 'equal',
      tags: ['Food', 'Travel'],
      status: 'active',
      verificationStatus: 'partially_verified',
      visibility: 'shared_event',
      syncStatus: 'synced',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    withGeneratedObligations({
      id: 'expense_ski_rentals',
      remoteId: null,
      eventId: 'event_ski_sweden',
      creatorUserId: 'demo_user_daniel',
      payerId: 'event_member_ski_daniel',
      amount: 360,
      currency: 'EUR',
      title: 'Ski rentals',
      notes: 'Daniel paid for three rental sets.',
      expenseDate: todayIsoDate(),
      participantIds: ['event_member_ski_benjamin', 'event_member_ski_daniel', 'event_member_ski_sarah'],
      splitMethod: 'equal',
      tags: ['Travel'],
      status: 'active',
      verificationStatus: 'verified',
      visibility: 'shared_event',
      syncStatus: 'synced',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    withGeneratedObligations({
      id: 'expense_apartment_utilities',
      remoteId: null,
      eventId: 'event_apartment',
      creatorUserId: null,
      payerId: 'member_sarah',
      amount: 180,
      currency: 'USD',
      title: 'Utilities',
      notes: 'Manually marked disputed for the demo.',
      expenseDate: todayIsoDate(),
      participantIds: ['me', 'member_daniel', 'member_sarah'],
      splitMethod: 'equal',
      tags: ['Apartment', 'Rent'],
      status: 'active',
      verificationStatus: 'disputed',
      visibility: 'private',
      syncStatus: 'local_only',
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ];

  const eventDebts: EventDebt[] = [
    {
      id: 'event_debt_ski_daniel_sarah',
      remoteId: 'remote_event_debt_ski_daniel_sarah',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      creatorUserId: 'demo_user_daniel',
      debtorEventMemberId: 'event_member_ski_daniel',
      creditorEventMemberId: 'event_member_ski_sarah',
      amount: 200,
      currency: 'SEK',
      title: 'Lift-card cash',
      notes: 'Daniel owes Sarah for the group lift-card cash collection.',
      debtDate: todayIsoDate(),
      tags: ['Travel'],
      verificationStatus: 'pending',
      settlementStatus: 'active',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      syncStatus: 'synced',
    },
  ];

  const eventVerificationResponses: EventVerificationResponse[] = [
    {
      id: 'event_verify_groceries_daniel',
      remoteId: 'remote_event_verify_groceries_daniel',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      targetType: 'expense',
      targetId: 'expense_ski_groceries',
      remoteTargetId: null,
      eventMemberId: 'event_member_ski_daniel',
      linkedUserId: 'demo_user_daniel',
      responseStatus: 'verified',
      rejectionReason: null,
      respondedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'event_verify_groceries_emma',
      remoteId: 'remote_event_verify_groceries_emma',
      eventId: 'event_ski_sweden',
      remoteEventId: 'remote_event_ski_sweden',
      targetType: 'expense',
      targetId: 'expense_ski_groceries',
      remoteTargetId: null,
      eventMemberId: 'event_member_ski_emma',
      linkedUserId: 'demo_user_emma',
      responseStatus: 'pending',
      rejectionReason: null,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  const linkRequests: LinkRequest[] = [
    {
      id: 'link_demo_sarah',
      remoteId: null,
      requesterUserId: 'demo_user_local',
      targetUserId: null,
      targetEmail: 'sarah@example.com',
      targetPhone: null,
      requesterMemberId: 'member_sarah',
      requesterLabel: 'Sarah',
      status: 'pending',
      message: 'Please link so we can verify shared balances.',
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending_upload',
    },
    {
      id: 'link_demo_emma',
      remoteId: null,
      requesterUserId: 'demo_user_local',
      targetUserId: null,
      targetEmail: 'emma@example.com',
      targetPhone: null,
      requesterMemberId: 'member_emma',
      requesterLabel: 'Emma',
      status: 'rejected',
      message: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  const debtVerifications: DebtVerification[] = [
    {
      id: 'verify_demo_daniel_backpack',
      remoteId: null,
      debtId: 'debt_daniel_backpack',
      remoteDebtId: 'remote_debt_demo_daniel_backpack',
      requesterUserId: 'demo_user_local',
      responderUserId: 'demo_user_daniel',
      status: 'verified',
      rejectionReason: null,
      suggestedChange: null,
      requestedAt: timestamp,
      respondedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
    {
      id: 'verify_demo_sarah_dinner',
      remoteId: null,
      debtId: 'debt_sarah_dinner',
      remoteDebtId: 'remote_debt_demo_sarah_dinner',
      requesterUserId: 'demo_user_local',
      responderUserId: 'demo_user_sarah',
      status: 'pending',
      rejectionReason: null,
      suggestedChange: null,
      requestedAt: timestamp,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending_upload',
    },
    {
      id: 'verify_demo_emma_rejected',
      remoteId: null,
      debtId: 'debt_emma_rejected',
      remoteDebtId: 'remote_debt_demo_emma_rejected',
      requesterUserId: 'demo_user_local',
      responderUserId: 'demo_user_emma',
      status: 'rejected',
      rejectionReason: 'I paid my own change fee at the station.',
      suggestedChange: { amount: 40, currency: 'GBP', reason: 'Only the flexible-ticket fee was shared.' },
      requestedAt: timestamp,
      respondedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    },
  ];

  for (const member of members) {
    await insertMember(db, member);
  }
  for (const event of events) {
    await insertEvent(db, event);
  }
  for (const eventMember of eventMembers) {
    await insertEventMember(db, eventMember);
  }
  for (const participant of eventParticipants) {
    await insertEventParticipant(db, participant);
  }
  for (const invite of eventInvites) {
    await insertEventInvite(db, invite);
  }
  for (const eventMember of sharedEventMembers) {
    await insertSharedEventMember(db, eventMember);
  }
  for (const claim of eventMemberClaims) {
    await insertEventMemberClaim(db, claim);
  }
  for (const warning of eventDuplicateWarnings) {
    await insertEventDuplicateWarning(db, warning);
  }
  for (const debt of debts) {
    await insertDebt(db, debt);
  }
  for (const expense of sharedExpenses) {
    await insertSharedExpense(db, expense);
  }
  for (const debt of eventDebts) {
    await insertEventDebt(db, debt);
  }
  for (const verification of eventVerificationResponses) {
    await insertEventVerificationResponse(db, verification);
  }
  for (const linkRequest of linkRequests) {
    await insertLinkRequest(db, linkRequest);
  }
  for (const verification of debtVerifications) {
    await insertDebtVerification(db, verification);
  }
  await insertActivityLog(db, {
    id: 'activity_demo_verified',
    entityKind: 'debt',
    entityId: 'debt_daniel_backpack',
    actorUserId: 'demo_user_daniel',
    action: 'debt_verified',
    metadata: { verificationId: 'verify_demo_daniel_backpack' },
    createdAt: timestamp,
  });
  await insertEventActivityLog(db, {
    id: 'event_activity_ski_created',
    remoteId: 'remote_event_activity_ski_created',
    eventId: 'event_ski_sweden',
    remoteEventId: 'remote_event_ski_sweden',
    actorUserId: 'demo_user_local',
    action: 'event_created',
    targetType: 'event',
    targetId: 'event_ski_sweden',
    metadata: { name: 'Ski Trip Sweden' },
    createdAt: timestamp,
    syncStatus: 'synced',
  });
  await insertEventActivityLog(db, {
    id: 'event_activity_ski_duplicate',
    remoteId: 'remote_event_activity_ski_duplicate',
    eventId: 'event_ski_sweden',
    remoteEventId: 'remote_event_ski_sweden',
    actorUserId: 'demo_user_local',
    action: 'possible_duplicate_member_detected',
    targetType: 'event_duplicate_warning',
    targetId: 'duplicate_ski_dad',
    metadata: { memberA: 'Dad', memberB: "Benjamin's Dad" },
    createdAt: timestamp,
    syncStatus: 'synced',
  });
  await insertActivityLog(db, {
    id: 'activity_demo_rejected',
    entityKind: 'debt',
    entityId: 'debt_emma_rejected',
    actorUserId: 'demo_user_emma',
    action: 'debt_rejected',
    metadata: { verificationId: 'verify_demo_emma_rejected', reason: 'I paid my own change fee at the station.' },
    createdAt: timestamp,
  });

  await upsertTagNames(db, [
    'Family',
    'Friends',
    'Food',
    'Travel',
    'Rent',
    'Gift',
    'Christmas 2025',
    'Petrol',
    'Apartment',
  ]);
}

export async function loadSnapshot(db: SQLite.SQLiteDatabase): Promise<DatabaseSnapshot> {
  const [
    profiles,
    members,
    debts,
    events,
    eventMembers,
    eventParticipants,
    eventInvites,
    sharedEventMembers,
    eventMemberClaims,
    eventDuplicateWarnings,
    sharedExpenses,
    eventDebts,
    eventVerificationResponses,
    eventActivityLogs,
    linkRequests,
    debtVerifications,
    activityLogs,
    tags,
    currencyRates,
    settings,
  ] =
    await Promise.all([
      getProfiles(db),
      getMembers(db),
      getDebts(db),
      getEvents(db),
      getEventMembers(db),
      getEventParticipants(db),
      getEventInvites(db),
      getSharedEventMembers(db),
      getEventMemberClaims(db),
      getEventDuplicateWarnings(db),
      getSharedExpenses(db),
      getEventDebts(db),
      getEventVerificationResponses(db),
      getEventActivityLogs(db),
      getLinkRequests(db),
      getDebtVerifications(db),
      getActivityLogs(db),
      getTags(db),
      getCurrencyRates(db),
      getSettings(db),
    ]);

  return {
    profiles,
    members,
    debts,
    events,
    eventMembers,
    eventParticipants,
    eventInvites,
    sharedEventMembers,
    eventMemberClaims,
    eventDuplicateWarnings,
    sharedExpenses,
    eventDebts,
    eventVerificationResponses,
    eventActivityLogs,
    linkRequests,
    debtVerifications,
    activityLogs,
    tags,
    currencyRates,
    settings,
  };
}

export async function getProfiles(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<UserProfileRow>(`SELECT * FROM user_profiles ORDER BY updated_at DESC`);
  return rows.map(mapProfileRow);
}

export async function getMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<MemberRow>(`SELECT * FROM members ORDER BY display_name COLLATE NOCASE`);
  return rows.map(mapMemberRow);
}

export async function getDebts(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<DebtRow>(`SELECT * FROM debts ORDER BY debt_date DESC, created_at DESC`);
  return rows.map(mapDebtRow);
}

export async function getEvents(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventRow>(`SELECT * FROM events ORDER BY updated_at DESC`);
  return rows.map(mapEventRow);
}

export async function getEventMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventMemberRow>(`SELECT * FROM event_members`);
  return rows.map((row) => ({
    eventId: row.event_id,
    memberId: row.member_id,
    createdAt: row.created_at,
  }));
}

export async function getEventParticipants(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventParticipantRow>(`SELECT * FROM event_participants ORDER BY updated_at DESC`);
  return rows.map(mapEventParticipantRow);
}

export async function getEventInvites(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventInviteRow>(`SELECT * FROM event_invites ORDER BY updated_at DESC`);
  return rows.map(mapEventInviteRow);
}

export async function getSharedEventMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SharedEventMemberRow>(
    `SELECT * FROM shared_event_members ORDER BY display_name COLLATE NOCASE`,
  );
  return rows.map(mapSharedEventMemberRow);
}

export async function getEventMemberClaims(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventMemberClaimRow>(`SELECT * FROM event_member_claims ORDER BY updated_at DESC`);
  return rows.map(mapEventMemberClaimRow);
}

export async function getEventDuplicateWarnings(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventDuplicateWarningRow>(
    `SELECT * FROM event_duplicate_warnings ORDER BY updated_at DESC`,
  );
  return rows.map(mapEventDuplicateWarningRow);
}

export async function getSharedExpenses(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SharedExpenseRow>(
    `SELECT * FROM shared_expenses ORDER BY expense_date DESC, created_at DESC`,
  );
  return rows.map(mapSharedExpenseRow);
}

export async function getEventDebts(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventDebtRow>(`SELECT * FROM event_debts ORDER BY debt_date DESC, created_at DESC`);
  return rows.map(mapEventDebtRow);
}

export async function getEventVerificationResponses(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventVerificationResponseRow>(
    `SELECT * FROM event_verification_responses ORDER BY updated_at DESC`,
  );
  return rows.map(mapEventVerificationResponseRow);
}

export async function getEventActivityLogs(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EventActivityLogRow>(
    `SELECT * FROM event_activity_logs ORDER BY created_at DESC LIMIT 500`,
  );
  return rows.map(mapEventActivityLogRow);
}

export async function getLinkRequests(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<LinkRequestRow>(`SELECT * FROM link_requests ORDER BY updated_at DESC`);
  return rows.map(mapLinkRequestRow);
}

export async function getDebtVerifications(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<DebtVerificationRow>(
    `SELECT * FROM debt_verifications ORDER BY updated_at DESC`,
  );
  return rows.map(mapDebtVerificationRow);
}

export async function getActivityLogs(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<ActivityLogRow>(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200`);
  return rows.map(mapActivityLogRow);
}

export async function getTags(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<TagRow>(`SELECT * FROM tags ORDER BY name COLLATE NOCASE`);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }));
}

export async function getCurrencyRates(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<RateRow>(`SELECT * FROM currency_rates ORDER BY currency`);
  return rows.map((row) => ({
    currency: row.currency,
    rateToSek: row.rate_to_sek,
    updatedAt: row.updated_at,
  }));
}

export async function getSettings(db: SQLite.SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<SettingRow>(`SELECT * FROM app_settings`);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    baseCurrency: ((values.baseCurrency as CurrencyCode | undefined) ?? DEFAULT_BASE_CURRENCY),
    showEstimatedBase: values.showEstimatedBase !== 'false',
    theme: values.theme === 'light' || values.theme === 'dark' ? values.theme : 'system',
  };
}

export async function insertMember(db: SQLite.SQLiteDatabase, member: Member) {
  await db.runAsync(
    `INSERT OR REPLACE INTO members
      (id, display_name, notes, email, phone, remote_id, linked_user_id, link_status, link_request_id,
       linked_profile_display_name, linked_profile_email, linked_profile_phone, sync_status, tags_json,
       archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member.id,
      member.displayName,
      member.notes,
      member.email,
      member.phone,
      member.remoteId,
      member.linkedUserId,
      member.linkStatus,
      member.linkRequestId,
      member.linkedProfileDisplayName,
      member.linkedProfileEmail,
      member.linkedProfilePhone,
      member.syncStatus,
      toJson(member.tags),
      member.archived ? 1 : 0,
      member.createdAt,
      member.updatedAt,
    ],
  );
  await upsertTagNames(db, member.tags);
}

export async function insertDebt(db: SQLite.SQLiteDatabase, debt: Debt) {
  await db.runAsync(
    `INSERT OR REPLACE INTO debts
      (id, member_id, remote_id, verification_request_id, visibility, sync_status, direction, amount,
       currency, title, notes, shared_notes, debt_date, due_date, tags_json, event_id, status,
       verification_status, verified_by_user_id, verified_at, rejected_by_user_id, rejected_at,
       rejection_reason, dispute_reason, resolution_note, suggested_change_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      debt.id,
      debt.memberId,
      debt.remoteId,
      debt.verificationRequestId,
      debt.visibility,
      debt.syncStatus,
      debt.direction,
      debt.amount,
      debt.currency,
      debt.title,
      debt.notes,
      debt.sharedNotes,
      debt.debtDate,
      debt.dueDate,
      toJson(debt.tags),
      debt.eventId,
      debt.status,
      debt.verificationStatus,
      debt.verifiedByUserId,
      debt.verifiedAt,
      debt.rejectedByUserId,
      debt.rejectedAt,
      debt.rejectionReason,
      debt.disputeReason,
      debt.resolutionNote,
      debt.suggestedChange ? toJson(debt.suggestedChange) : null,
      debt.createdAt,
      debt.updatedAt,
    ],
  );
  await upsertTagNames(db, debt.tags);
}

export async function insertEvent(db: SQLite.SQLiteDatabase, event: Event) {
  await db.runAsync(
    `INSERT OR REPLACE INTO events
      (id, local_id, remote_id, owner_user_id, name, notes, default_currency, allowed_currencies_json,
       tags_json, status, visibility, sync_status, archived, archived_at, finalised_at, locked_at,
       ignored_duplicate_keys_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.localId,
      event.remoteId,
      event.ownerUserId,
      event.name,
      event.notes,
      event.defaultCurrency,
      toJson(event.allowedCurrencies),
      toJson(event.tags),
      event.status,
      event.visibility,
      event.syncStatus,
      event.archived ? 1 : 0,
      event.archivedAt,
      event.finalisedAt,
      event.lockedAt,
      toJson(event.ignoredDuplicateKeys),
      event.createdAt,
      event.updatedAt,
    ],
  );
  await upsertTagNames(db, event.tags);
}

export async function insertEventMember(db: SQLite.SQLiteDatabase, eventMember: EventMember) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_members (event_id, member_id, created_at) VALUES (?, ?, ?)`,
    [eventMember.eventId, eventMember.memberId, eventMember.createdAt],
  );
}

export async function insertEventParticipant(db: SQLite.SQLiteDatabase, participant: EventParticipant) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_participants
      (id, remote_id, event_id, remote_event_id, user_id, role, status, joined_at, created_at,
       updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      participant.id,
      participant.remoteId,
      participant.eventId,
      participant.remoteEventId,
      participant.userId,
      participant.role,
      participant.status,
      participant.joinedAt,
      participant.createdAt,
      participant.updatedAt,
      participant.syncStatus,
    ],
  );
}

export async function insertEventInvite(db: SQLite.SQLiteDatabase, invite: EventInvite) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_invites
      (id, remote_id, event_id, remote_event_id, inviter_user_id, invited_user_id, invited_email,
       invited_phone, invited_display_name, offered_role, status, message, created_at, updated_at,
       responded_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invite.id,
      invite.remoteId,
      invite.eventId,
      invite.remoteEventId,
      invite.inviterUserId,
      invite.invitedUserId,
      invite.invitedEmail,
      invite.invitedPhone,
      invite.invitedDisplayName,
      invite.offeredRole,
      invite.status,
      invite.message,
      invite.createdAt,
      invite.updatedAt,
      invite.respondedAt,
      invite.syncStatus,
    ],
  );
}

export async function insertSharedEventMember(db: SQLite.SQLiteDatabase, member: SharedEventMember) {
  await db.runAsync(
    `INSERT OR REPLACE INTO shared_event_members
      (id, remote_id, event_id, remote_event_id, type, linked_user_id, display_name, alias,
       email, phone, notes, created_by_user_id, status, merged_into_event_member_id, created_at,
       updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member.id,
      member.remoteId,
      member.eventId,
      member.remoteEventId,
      member.type,
      member.linkedUserId,
      member.displayName,
      member.alias,
      member.email,
      member.phone,
      member.notes,
      member.createdByUserId,
      member.status,
      member.mergedIntoEventMemberId,
      member.createdAt,
      member.updatedAt,
      member.syncStatus,
    ],
  );
}

export async function insertEventMemberClaim(db: SQLite.SQLiteDatabase, claim: EventMemberClaim) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_member_claims
      (id, remote_id, event_id, remote_event_id, event_member_id, remote_event_member_id,
       claimant_user_id, status, message, responded_by_user_id, responded_at, created_at,
       updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      claim.id,
      claim.remoteId,
      claim.eventId,
      claim.remoteEventId,
      claim.eventMemberId,
      claim.remoteEventMemberId,
      claim.claimantUserId,
      claim.status,
      claim.message,
      claim.respondedByUserId,
      claim.respondedAt,
      claim.createdAt,
      claim.updatedAt,
      claim.syncStatus,
    ],
  );
}

export async function insertEventDuplicateWarning(db: SQLite.SQLiteDatabase, warning: EventDuplicateWarning) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_duplicate_warnings
      (id, remote_id, event_id, event_member_id_a, event_member_id_b, reason, confidence,
       status, ignored_by_user_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      warning.id,
      warning.remoteId,
      warning.eventId,
      warning.eventMemberIdA,
      warning.eventMemberIdB,
      warning.reason,
      warning.confidence,
      warning.status,
      warning.ignoredByUserId,
      warning.createdAt,
      warning.updatedAt,
      warning.syncStatus,
    ],
  );
}

export async function insertSharedExpense(db: SQLite.SQLiteDatabase, expense: SharedExpense) {
  await db.runAsync(
    `INSERT OR REPLACE INTO shared_expenses
      (id, remote_id, event_id, creator_user_id, payer_id, amount, currency, title, notes, expense_date,
       participant_ids_json, split_method, generated_obligations_json, tags_json, status,
       verification_status, visibility, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.remoteId,
      expense.eventId,
      expense.creatorUserId,
      expense.payerId,
      expense.amount,
      expense.currency,
      expense.title,
      expense.notes,
      expense.expenseDate,
      toJson(expense.participantIds),
      expense.splitMethod,
      toJson(expense.generatedObligations),
      toJson(expense.tags),
      expense.status,
      expense.verificationStatus,
      expense.visibility,
      expense.syncStatus,
      expense.createdAt,
      expense.updatedAt,
    ],
  );
  await upsertTagNames(db, expense.tags);
}

export async function insertEventDebt(db: SQLite.SQLiteDatabase, debt: EventDebt) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_debts
      (id, remote_id, event_id, remote_event_id, creator_user_id, debtor_event_member_id,
       creditor_event_member_id, amount, currency, title, notes, debt_date, tags_json,
       verification_status, settlement_status, status, created_at, updated_at, archived_at,
       sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      debt.id,
      debt.remoteId,
      debt.eventId,
      debt.remoteEventId,
      debt.creatorUserId,
      debt.debtorEventMemberId,
      debt.creditorEventMemberId,
      debt.amount,
      debt.currency,
      debt.title,
      debt.notes,
      debt.debtDate,
      toJson(debt.tags),
      debt.verificationStatus,
      debt.settlementStatus,
      debt.status,
      debt.createdAt,
      debt.updatedAt,
      debt.archivedAt,
      debt.syncStatus,
    ],
  );
  await upsertTagNames(db, debt.tags);
}

export async function insertEventVerificationResponse(
  db: SQLite.SQLiteDatabase,
  response: EventVerificationResponse,
) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_verification_responses
      (id, remote_id, event_id, remote_event_id, target_type, target_id, remote_target_id,
       event_member_id, linked_user_id, response_status, rejection_reason, responded_at,
       created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      response.id,
      response.remoteId,
      response.eventId,
      response.remoteEventId,
      response.targetType,
      response.targetId,
      response.remoteTargetId,
      response.eventMemberId,
      response.linkedUserId,
      response.responseStatus,
      response.rejectionReason,
      response.respondedAt,
      response.createdAt,
      response.updatedAt,
      response.syncStatus,
    ],
  );
}

export async function insertEventActivityLog(db: SQLite.SQLiteDatabase, activity: EventActivityLog) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_activity_logs
      (id, remote_id, event_id, remote_event_id, actor_user_id, action, target_type, target_id,
       metadata_json, created_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.id,
      activity.remoteId,
      activity.eventId,
      activity.remoteEventId,
      activity.actorUserId,
      activity.action,
      activity.targetType,
      activity.targetId,
      toJson(activity.metadata),
      activity.createdAt,
      activity.syncStatus,
    ],
  );
}

export async function insertProfile(db: SQLite.SQLiteDatabase, profile: UserProfile) {
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profiles
      (id, display_name, email, phone, avatar_url, base_currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.displayName,
      profile.email,
      profile.phone,
      profile.avatarUrl,
      profile.baseCurrency,
      profile.createdAt,
      profile.updatedAt,
    ],
  );
}

export async function insertLinkRequest(db: SQLite.SQLiteDatabase, linkRequest: LinkRequest) {
  await db.runAsync(
    `INSERT OR REPLACE INTO link_requests
      (id, remote_id, requester_user_id, target_user_id, target_email, target_phone, requester_member_id,
       requester_label, status, message, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      linkRequest.id,
      linkRequest.remoteId,
      linkRequest.requesterUserId,
      linkRequest.targetUserId,
      linkRequest.targetEmail,
      linkRequest.targetPhone,
      linkRequest.requesterMemberId,
      linkRequest.requesterLabel,
      linkRequest.status,
      linkRequest.message,
      linkRequest.createdAt,
      linkRequest.updatedAt,
      linkRequest.syncStatus,
    ],
  );
}

export async function insertDebtVerification(db: SQLite.SQLiteDatabase, verification: DebtVerification) {
  await db.runAsync(
    `INSERT OR REPLACE INTO debt_verifications
      (id, remote_id, debt_id, remote_debt_id, requester_user_id, responder_user_id, status,
       rejection_reason, suggested_change_json, requested_at, responded_at, created_at, updated_at,
       sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      verification.id,
      verification.remoteId,
      verification.debtId,
      verification.remoteDebtId,
      verification.requesterUserId,
      verification.responderUserId,
      verification.status,
      verification.rejectionReason,
      verification.suggestedChange ? toJson(verification.suggestedChange) : null,
      verification.requestedAt,
      verification.respondedAt,
      verification.createdAt,
      verification.updatedAt,
      verification.syncStatus,
    ],
  );
}

export async function insertActivityLog(db: SQLite.SQLiteDatabase, activity: ActivityLog) {
  await db.runAsync(
    `INSERT OR REPLACE INTO activity_log
      (id, entity_kind, entity_id, actor_user_id, action, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.id,
      activity.entityKind,
      activity.entityId,
      activity.actorUserId,
      activity.action,
      toJson(activity.metadata),
      activity.createdAt,
    ],
  );
}

export async function deleteEventMember(db: SQLite.SQLiteDatabase, eventId: string, memberId: string) {
  await db.runAsync(`DELETE FROM event_members WHERE event_id = ? AND member_id = ?`, [eventId, memberId]);
}

export async function updateSetting(db: SQLite.SQLiteDatabase, key: keyof AppSettings, value: string) {
  await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
}

export async function updateCurrencyRate(db: SQLite.SQLiteDatabase, currency: CurrencyCode, rateToSek: number) {
  await db.runAsync(
    `INSERT OR REPLACE INTO currency_rates (currency, rate_to_sek, updated_at) VALUES (?, ?, ?)`,
    [currency, rateToSek, nowIso()],
  );
}

export async function upsertTagNames(db: SQLite.SQLiteDatabase, tagNames: string[]) {
  const timestamp = nowIso();
  const colors = ['#DCEDE8', '#FCE7E1', '#E4ECFA', '#FEF2D2', '#EEE8F8', '#E7F0DD'];
  const unique = Array.from(new Set(tagNames.map((tag) => tag.trim()).filter(Boolean)));

  for (let index = 0; index < unique.length; index += 1) {
    const name = unique[index];
    await db.runAsync(`INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)`, [
      createId('tag'),
      name,
      colors[index % colors.length],
      timestamp,
    ]);
  }
}

export function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    displayName: row.display_name,
    notes: row.notes,
    email: row.email,
    phone: row.phone,
    remoteId: row.remote_id ?? null,
    linkedUserId: row.linked_user_id ?? null,
    linkStatus: row.link_status ?? 'unlinked',
    linkRequestId: row.link_request_id ?? null,
    linkedProfileDisplayName: row.linked_profile_display_name ?? null,
    linkedProfileEmail: row.linked_profile_email ?? null,
    linkedProfilePhone: row.linked_profile_phone ?? null,
    syncStatus: row.sync_status ?? 'local_only',
    tags: parseJsonArray<string>(row.tags_json),
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDebtRow(row: DebtRow): Debt {
  return {
    id: row.id,
    type: 'simple',
    memberId: row.member_id,
    remoteId: row.remote_id ?? null,
    verificationRequestId: row.verification_request_id ?? null,
    visibility: row.visibility ?? 'private',
    syncStatus: row.sync_status ?? 'local_only',
    direction: row.direction,
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    notes: row.notes,
    sharedNotes: row.shared_notes ?? null,
    debtDate: row.debt_date,
    dueDate: row.due_date,
    tags: parseJsonArray<string>(row.tags_json),
    eventId: row.event_id,
    status: row.status,
    verificationStatus: row.verification_status,
    verifiedByUserId: row.verified_by_user_id ?? null,
    verifiedAt: row.verified_at ?? null,
    rejectedByUserId: row.rejected_by_user_id ?? null,
    rejectedAt: row.rejected_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    disputeReason: row.dispute_reason ?? null,
    resolutionNote: row.resolution_note ?? null,
    suggestedChange: row.suggested_change_json
      ? (parseJsonObject(row.suggested_change_json, {}) as Debt['suggestedChange'])
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    localId: row.local_id ?? null,
    remoteId: row.remote_id ?? null,
    ownerUserId: row.owner_user_id ?? null,
    name: row.name,
    notes: row.notes,
    defaultCurrency: row.default_currency,
    allowedCurrencies: parseJsonArray<CurrencyCode>(row.allowed_currencies_json),
    tags: parseJsonArray<string>(row.tags_json),
    status: row.status,
    visibility: row.visibility ?? 'private',
    syncStatus: row.sync_status ?? 'local_only',
    archived: row.archived === 1,
    archivedAt: row.archived_at ?? null,
    finalisedAt: row.finalised_at ?? null,
    lockedAt: row.locked_at ?? null,
    ignoredDuplicateKeys: parseJsonArray<string>(row.ignored_duplicate_keys_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventParticipantRow(row: EventParticipantRow): EventParticipant {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapEventInviteRow(row: EventInviteRow): EventInvite {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    inviterUserId: row.inviter_user_id,
    invitedUserId: row.invited_user_id,
    invitedEmail: row.invited_email,
    invitedPhone: row.invited_phone,
    invitedDisplayName: row.invited_display_name,
    offeredRole: row.offered_role,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapSharedEventMemberRow(row: SharedEventMemberRow): SharedEventMember {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    type: row.type,
    linkedUserId: row.linked_user_id,
    displayName: row.display_name,
    alias: row.alias,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    mergedIntoEventMemberId: row.merged_into_event_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapEventMemberClaimRow(row: EventMemberClaimRow): EventMemberClaim {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    eventMemberId: row.event_member_id,
    remoteEventMemberId: row.remote_event_member_id,
    claimantUserId: row.claimant_user_id,
    status: row.status,
    message: row.message,
    respondedByUserId: row.responded_by_user_id,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapEventDuplicateWarningRow(row: EventDuplicateWarningRow): EventDuplicateWarning {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    eventMemberIdA: row.event_member_id_a,
    eventMemberIdB: row.event_member_id_b,
    reason: row.reason,
    confidence: row.confidence,
    status: row.status,
    ignoredByUserId: row.ignored_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapSharedExpenseRow(row: SharedExpenseRow): SharedExpense {
  return {
    id: row.id,
    remoteId: row.remote_id ?? null,
    eventId: row.event_id,
    creatorUserId: row.creator_user_id ?? null,
    payerId: row.payer_id,
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    notes: row.notes,
    expenseDate: row.expense_date,
    participantIds: parseJsonArray(row.participant_ids_json),
    splitMethod: row.split_method,
    generatedObligations: parseJsonArray(row.generated_obligations_json),
    tags: parseJsonArray<string>(row.tags_json),
    status: row.status,
    verificationStatus: row.verification_status,
    visibility: row.visibility ?? 'private',
    syncStatus: row.sync_status ?? 'local_only',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventDebtRow(row: EventDebtRow): EventDebt {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    creatorUserId: row.creator_user_id,
    debtorEventMemberId: row.debtor_event_member_id,
    creditorEventMemberId: row.creditor_event_member_id,
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    notes: row.notes,
    debtDate: row.debt_date,
    tags: parseJsonArray<string>(row.tags_json),
    verificationStatus: row.verification_status,
    settlementStatus: row.settlement_status,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapEventVerificationResponseRow(row: EventVerificationResponseRow): EventVerificationResponse {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    targetType: row.target_type,
    targetId: row.target_id,
    remoteTargetId: row.remote_target_id,
    eventMemberId: row.event_member_id,
    linkedUserId: row.linked_user_id,
    responseStatus: row.response_status,
    rejectionReason: row.rejection_reason,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapEventActivityLogRow(row: EventActivityLogRow): EventActivityLog {
  return {
    id: row.id,
    remoteId: row.remote_id,
    eventId: row.event_id,
    remoteEventId: row.remote_event_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: parseJsonObject(row.metadata_json, {}),
    createdAt: row.created_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapProfileRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    baseCurrency: row.base_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLinkRequestRow(row: LinkRequestRow): LinkRequest {
  return {
    id: row.id,
    remoteId: row.remote_id,
    requesterUserId: row.requester_user_id,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    targetPhone: row.target_phone,
    requesterMemberId: row.requester_member_id,
    requesterLabel: row.requester_label,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapDebtVerificationRow(row: DebtVerificationRow): DebtVerification {
  return {
    id: row.id,
    remoteId: row.remote_id,
    debtId: row.debt_id,
    remoteDebtId: row.remote_debt_id,
    requesterUserId: row.requester_user_id,
    responderUserId: row.responder_user_id,
    status: row.status,
    rejectionReason: row.rejection_reason,
    suggestedChange: row.suggested_change_json
      ? (parseJsonObject(row.suggested_change_json, {}) as DebtVerification['suggestedChange'])
      : null,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapActivityLogRow(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    entityKind: row.entity_kind,
    entityId: row.entity_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    metadata: parseJsonObject(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}
