import * as SQLite from 'expo-sqlite';

import type { AppSnapshot } from '@/src/application/model/AppSnapshot';
import { DEFAULT_BASE_CURRENCY, DEFAULT_CURRENCY_RATES_TO_SEK } from '@/src/domain/finance/currencies';
import type {
  AppSettings,
  ActivityLog,
  AppNotification,
  Attachment,
  AuditLog,
  CurrencyCode,
  Comment,
  CsvImportBatch,
  Debt,
  DebtVerification,
  ExportLog,
  Group,
  GroupActivityLog,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMember,
  GroupMemberClaim,
  GroupParticipant,
  GroupVerificationResponse,
  ExpensePayer,
  LinkRequest,
  Member,
  OverpaymentCredit,
  Payment,
  RecurringTemplate,
  Reminder,
  SharedGroupMember,
  SharedExpense,
  Settlement,
  SettlementLine,
  SoftReminder,
  SmartSuggestion,
  SyncConflict,
  SyncQueueEntry,
  UserProfile,
} from '@/src/domain/models';
import { createId, nowIso } from '@/src/domain/shared/identifiers';
import {
  mapActivityLogRow,
  mapAttachmentRow,
  mapAuditLogRow,
  mapCommentRow,
  mapCsvImportBatchRow,
  mapDebtRow,
  mapDebtVerificationRow,
  mapExpensePayerRow,
  mapExportLogRow,
  mapGroupActivityLogRow,
  mapGroupDebtRow,
  mapGroupDuplicateWarningRow,
  mapGroupInviteRow,
  mapGroupMemberClaimRow,
  mapGroupParticipantRow,
  mapGroupRow,
  mapGroupVerificationResponseRow,
  mapLinkRequestRow,
  mapMemberRow,
  mapNotificationRow,
  mapOverpaymentCreditRow,
  mapPaymentRow,
  mapProfileRow,
  mapRecurringTemplateRow,
  mapReminderRow,
  mapSettlementLineRow,
  mapSettlementRow,
  mapSharedExpenseRow,
  mapSharedGroupMemberRow,
  mapSmartSuggestionRow,
  mapSoftReminderRow,
  mapSyncConflictRow,
  mapSyncQueueRow,
} from '@/src/infrastructure/sqlite/mappers';
import type {
  ActivityLogRow,
  AttachmentRow,
  AuditLogRow,
  CommentRow,
  CsvImportBatchRow,
  DebtRow,
  DebtVerificationRow,
  ExpensePayerRow,
  ExportLogRow,
  GroupActivityLogRow,
  GroupDebtRow,
  GroupDuplicateWarningRow,
  GroupInviteRow,
  GroupMemberClaimRow,
  GroupMemberRow,
  GroupParticipantRow,
  GroupRow,
  GroupVerificationResponseRow,
  LinkRequestRow,
  MemberRow,
  NotificationRow,
  OverpaymentCreditRow,
  PaymentRow,
  RateRow,
  RecurringTemplateRow,
  ReminderRow,
  SettingRow,
  SettlementLineRow,
  SettlementRow,
  SharedExpenseRow,
  SharedGroupMemberRow,
  SmartSuggestionRow,
  SoftReminderRow,
  SyncConflictRow,
  SyncQueueRow,
  TagRow,
  UserProfileRow,
} from '@/src/infrastructure/sqlite/rows';
import { toJson } from '@/src/infrastructure/sqlite/sqlJson';

export * from '@/src/infrastructure/sqlite/mappers';

const DB_NAME = 'debtulator-stage1.db';
export async function openDebtulatorDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  await initializeDefaults(db);
  return db;
}

export async function migrate(db: SQLite.SQLiteDatabase) {
  await migrateLegacyGroupSchema(db);

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

    CREATE TABLE IF NOT EXISTS groups (
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

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (group_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS group_participants (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      joined_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS group_participants_group_user_unique
      ON group_participants(group_id, user_id);

    CREATE TABLE IF NOT EXISTS group_invites (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
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

    CREATE TABLE IF NOT EXISTS shared_group_members (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
      type TEXT NOT NULL,
      linked_user_id TEXT,
      display_name TEXT NOT NULL,
      alias TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_by_user_id TEXT,
      status TEXT NOT NULL,
      merged_into_group_member_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS shared_group_members_linked_unique
      ON shared_group_members(group_id, linked_user_id)
      WHERE linked_user_id IS NOT NULL AND status != 'merged';

    CREATE TABLE IF NOT EXISTS group_member_claims (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
      group_member_id TEXT NOT NULL,
      remote_group_member_id TEXT,
      claimant_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      responded_by_user_id TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS group_duplicate_warnings (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      group_member_id_a TEXT NOT NULL,
      group_member_id_b TEXT NOT NULL,
      reason TEXT NOT NULL,
      confidence TEXT NOT NULL,
      status TEXT NOT NULL,
      ignored_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS group_duplicate_warning_pair_unique
      ON group_duplicate_warnings(group_id, group_member_id_a, group_member_id_b, reason);

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
      recurring_template_id TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      group_id TEXT,
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
      group_id TEXT NOT NULL,
      creator_user_id TEXT,
      payer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      expense_date TEXT NOT NULL,
      participant_ids_json TEXT NOT NULL DEFAULT '[]',
      split_method TEXT NOT NULL,
      split_allocations_json TEXT NOT NULL DEFAULT '{}',
      generated_obligations_json TEXT NOT NULL DEFAULT '[]',
      due_date TEXT,
      recurring_template_id TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_debts (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
      creator_user_id TEXT,
      debtor_group_member_id TEXT NOT NULL,
      creditor_group_member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      debt_date TEXT NOT NULL,
      due_date TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      verification_status TEXT NOT NULL,
      settlement_status TEXT NOT NULL DEFAULT 'active',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      local_id TEXT,
      remote_id TEXT,
      created_by_user_id TEXT,
      payer_user_id TEXT,
      payee_user_id TEXT,
      payer_member_id TEXT,
      payee_member_id TEXT,
      payer_group_member_id TEXT,
      payee_group_member_id TEXT,
      group_id TEXT,
      related_member_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      confirmation_status TEXT NOT NULL,
      visibility TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY NOT NULL,
      local_id TEXT,
      remote_id TEXT,
      created_by_user_id TEXT,
      group_id TEXT,
      member_id TEXT,
      type TEXT NOT NULL,
      currency TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL,
      confirmation_status TEXT NOT NULL,
      notes TEXT,
      original_currency TEXT,
      original_amount REAL,
      settlement_currency TEXT,
      settlement_amount REAL,
      exchange_rate_used REAL,
      exchange_rate_date TEXT,
      conversion_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS settlement_lines (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      settlement_id TEXT NOT NULL,
      payment_id TEXT,
      source_record_type TEXT NOT NULL,
      source_record_id TEXT NOT NULL,
      applied_amount REAL NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE TABLE IF NOT EXISTS expense_payers (
      id TEXT PRIMARY KEY NOT NULL,
      expense_id TEXT NOT NULL,
      group_member_id TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id TEXT PRIMARY KEY NOT NULL,
      created_by_user_id TEXT,
      group_id TEXT,
      member_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      recurrence_rule TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_occurrence_date TEXT NOT NULL,
      last_generated_date TEXT,
      status TEXT NOT NULL,
      auto_generate INTEGER NOT NULL DEFAULT 0,
      reminder_settings_json TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      remind_at TEXT NOT NULL,
      repeat_rule TEXT,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS soft_reminders (
      id TEXT PRIMARY KEY NOT NULL,
      sender_user_id TEXT,
      recipient_user_id TEXT,
      related_member_id TEXT,
      related_group_id TEXT,
      related_record_id TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overpayment_credits (
      id TEXT PRIMARY KEY NOT NULL,
      created_by_user_id TEXT,
      payer_member_id TEXT,
      payee_member_id TEXT,
      payer_group_member_id TEXT,
      payee_group_member_id TEXT,
      group_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      source_payment_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_verification_responses (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      remote_target_id TEXT,
      group_member_id TEXT NOT NULL,
      linked_user_id TEXT,
      response_status TEXT NOT NULL,
      rejection_reason TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS group_verification_response_unique
      ON group_verification_responses(group_id, target_type, target_id, group_member_id);

    CREATE TABLE IF NOT EXISTS group_activity_logs (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      group_id TEXT NOT NULL,
      remote_group_id TEXT,
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
      first_name TEXT,
      last_name TEXT,
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      country TEXT,
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
      request_type TEXT NOT NULL DEFAULT 'creation',
      change_summary_json TEXT,
      status TEXT NOT NULL,
      rejection_reason TEXT,
      suggested_change_json TEXT,
      supersedes_verification_id TEXT,
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

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      group_id TEXT,
      created_by_user_id TEXT,
      local_uri TEXT,
      remote_url TEXT,
      storage_path TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size REAL NOT NULL DEFAULT 0,
      attachment_kind TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      thumbnail_uri TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE INDEX IF NOT EXISTS attachments_target_idx
      ON attachments(target_type, target_id, archived_at);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      group_id TEXT,
      author_user_id TEXT,
      local_author_label TEXT,
      body TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );

    CREATE INDEX IF NOT EXISTS comments_target_idx
      ON comments(target_type, target_id, deleted_at);

    CREATE TABLE IF NOT EXISTS smart_suggestions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      suggestion_type TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS smart_suggestions_status_idx
      ON smart_suggestions(status, suggestion_type);

    CREATE TABLE IF NOT EXISTS export_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      export_type TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      created_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS csv_import_batches (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      status TEXT NOT NULL,
      source_name TEXT,
      row_count INTEGER NOT NULL DEFAULT 0,
      imported_member_count INTEGER NOT NULL DEFAULT 0,
      imported_debt_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      dependency_ids_json TEXT NOT NULL DEFAULT '[]',
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      error_code TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_attempt_at TEXT
    );

    CREATE INDEX IF NOT EXISTS sync_queue_status_idx
      ON sync_queue(status, created_at);

    CREATE INDEX IF NOT EXISTS sync_queue_entity_idx
      ON sync_queue(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      local_entity_id TEXT NOT NULL,
      remote_entity_id TEXT,
      conflict_type TEXT NOT NULL,
      local_snapshot_json TEXT NOT NULL DEFAULT '{}',
      remote_snapshot_json TEXT NOT NULL DEFAULT '{}',
      base_snapshot_json TEXT,
      detected_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unresolved',
      resolution TEXT,
      resolved_at TEXT,
      resolved_by_user_id TEXT
    );

    CREATE INDEX IF NOT EXISTS sync_conflicts_status_idx
      ON sync_conflicts(status, detected_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS notifications_user_read_idx
      ON notifications(user_id, read_at, created_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      group_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      device_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS audit_logs_target_idx
      ON audit_logs(target_type, target_id, created_at);

    CREATE INDEX IF NOT EXISTS audit_logs_group_idx
      ON audit_logs(group_id, created_at);

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
  await ensureColumn(db, 'user_profiles', 'first_name', 'TEXT');
  await ensureColumn(db, 'user_profiles', 'last_name', 'TEXT');
  await ensureColumn(db, 'user_profiles', 'country', 'TEXT');

  await ensureColumn(db, 'groups', 'local_id', 'TEXT');
  await ensureColumn(db, 'groups', 'remote_id', 'TEXT');
  await ensureColumn(db, 'groups', 'owner_user_id', 'TEXT');
  await ensureColumn(db, 'groups', 'allowed_currencies_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'groups', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'groups', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");
  await ensureColumn(db, 'groups', 'archived_at', 'TEXT');
  await ensureColumn(db, 'groups', 'finalised_at', 'TEXT');
  await ensureColumn(db, 'groups', 'locked_at', 'TEXT');

  await ensureColumn(db, 'debts', 'remote_id', 'TEXT');
  await ensureColumn(db, 'debts', 'verification_request_id', 'TEXT');
  await ensureColumn(db, 'debts', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'debts', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");
  await ensureColumn(db, 'debts', 'shared_notes', 'TEXT');
  await ensureColumn(db, 'debts', 'due_date', 'TEXT');
  await ensureColumn(db, 'debts', 'recurring_template_id', 'TEXT');
  await ensureColumn(db, 'debts', 'verified_by_user_id', 'TEXT');
  await ensureColumn(db, 'debts', 'verified_at', 'TEXT');
  await ensureColumn(db, 'debts', 'rejected_by_user_id', 'TEXT');
  await ensureColumn(db, 'debts', 'rejected_at', 'TEXT');
  await ensureColumn(db, 'debts', 'rejection_reason', 'TEXT');
  await ensureColumn(db, 'debts', 'dispute_reason', 'TEXT');
  await ensureColumn(db, 'debts', 'resolution_note', 'TEXT');
  await ensureColumn(db, 'debts', 'suggested_change_json', 'TEXT');
  await ensureColumn(db, 'debt_verifications', 'request_type', "TEXT NOT NULL DEFAULT 'creation'");
  await ensureColumn(db, 'debt_verifications', 'change_summary_json', 'TEXT');
  await ensureColumn(db, 'debt_verifications', 'supersedes_verification_id', 'TEXT');

  await ensureColumn(db, 'shared_expenses', 'remote_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'creator_user_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'split_allocations_json', "TEXT NOT NULL DEFAULT '{}'");
  await ensureColumn(db, 'shared_expenses', 'due_date', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'recurring_template_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'shared_expenses', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");

  await ensureColumn(db, 'group_debts', 'due_date', 'TEXT');
  await ensureColumn(db, 'activity_log', 'actor_user_id', 'TEXT');
  await ensureColumn(db, 'settlement_lines', 'remote_id', 'TEXT');
  await ensureColumn(db, 'settlement_lines', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");
  await ensureColumn(db, 'attachments', 'remote_id', 'TEXT');
  await ensureColumn(db, 'comments', 'remote_id', 'TEXT');

  for (const tableName of [
    'members',
    'debts',
    'groups',
    'group_participants',
    'group_invites',
    'shared_group_members',
    'group_member_claims',
    'group_duplicate_warnings',
    'shared_expenses',
    'group_debts',
    'payments',
    'settlements',
    'settlement_lines',
    'attachments',
    'comments',
  ]) {
    await ensureColumn(db, tableName, 'last_synced_at', 'TEXT');
    await ensureColumn(db, tableName, 'remote_updated_at', 'TEXT');
  }

  await migrateLegacyGroupValues(db);
  await createGroupIndexes(db);
}

async function createGroupIndexes(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS members_sync_idx ON members(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS members_remote_idx ON members(remote_id);
    CREATE INDEX IF NOT EXISTS debts_member_idx ON debts(member_id, debt_date);
    CREATE INDEX IF NOT EXISTS debts_group_idx ON debts(group_id, debt_date);
    CREATE INDEX IF NOT EXISTS debts_sync_idx ON debts(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS debts_status_idx ON debts(status, verification_status);
    CREATE INDEX IF NOT EXISTS groups_remote_idx ON groups(remote_id);
    CREATE INDEX IF NOT EXISTS groups_sync_idx ON groups(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS shared_expenses_group_idx ON shared_expenses(group_id, expense_date);
    CREATE INDEX IF NOT EXISTS shared_expenses_sync_idx ON shared_expenses(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS group_debts_group_idx ON group_debts(group_id, debt_date);
    CREATE INDEX IF NOT EXISTS group_debts_sync_idx ON group_debts(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS payments_group_idx ON payments(group_id, payment_date);
    CREATE INDEX IF NOT EXISTS payments_sync_idx ON payments(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS payments_remote_idx ON payments(remote_id);
    CREATE INDEX IF NOT EXISTS settlements_group_idx ON settlements(group_id, created_at);
    CREATE INDEX IF NOT EXISTS settlements_sync_idx ON settlements(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS settlements_remote_idx ON settlements(remote_id);
    CREATE INDEX IF NOT EXISTS settlement_lines_remote_idx ON settlement_lines(remote_id);
    CREATE INDEX IF NOT EXISTS settlement_lines_sync_idx ON settlement_lines(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS group_participants_remote_idx ON group_participants(remote_id);
    CREATE INDEX IF NOT EXISTS group_invites_remote_idx ON group_invites(remote_id);
    CREATE INDEX IF NOT EXISTS shared_group_members_remote_idx ON shared_group_members(remote_id);
    CREATE INDEX IF NOT EXISTS group_member_claims_remote_idx ON group_member_claims(remote_id);
    CREATE INDEX IF NOT EXISTS shared_expenses_remote_idx ON shared_expenses(remote_id);
    CREATE INDEX IF NOT EXISTS group_debts_remote_idx ON group_debts(remote_id);
    CREATE INDEX IF NOT EXISTS group_verification_responses_remote_idx ON group_verification_responses(remote_id);
    CREATE INDEX IF NOT EXISTS comments_remote_idx ON comments(remote_id);
    CREATE INDEX IF NOT EXISTS comments_sync_idx ON comments(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS attachments_remote_idx ON attachments(remote_id);
    CREATE INDEX IF NOT EXISTS attachments_sync_idx ON attachments(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders(status, remind_at);
    CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);
  `);
}

async function migrateLegacyGroupSchema(db: SQLite.SQLiteDatabase) {
  const tableRenames = [
    ['events', 'groups'],
    ['event_members', 'group_members'],
    ['event_participants', 'group_participants'],
    ['event_invites', 'group_invites'],
    ['shared_event_members', 'shared_group_members'],
    ['event_member_claims', 'group_member_claims'],
    ['event_duplicate_warnings', 'group_duplicate_warnings'],
    ['event_debts', 'group_debts'],
    ['event_verification_responses', 'group_verification_responses'],
    ['event_activity_logs', 'group_activity_logs'],
  ] as const;

  for (const [legacyName, groupName] of tableRenames) {
    if ((await tableExists(db, legacyName)) && !(await tableExists(db, groupName))) {
      await db.execAsync(`ALTER TABLE ${legacyName} RENAME TO ${groupName}`);
    }
  }

  const columnRenames: Record<string, readonly (readonly [string, string])[]> = {
    debts: [['event_id', 'group_id']],
    group_members: [['event_id', 'group_id']],
    group_participants: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
    ],
    group_invites: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
    ],
    shared_group_members: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
      ['merged_into_event_member_id', 'merged_into_group_member_id'],
    ],
    group_member_claims: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
      ['event_member_id', 'group_member_id'],
      ['remote_event_member_id', 'remote_group_member_id'],
    ],
    group_duplicate_warnings: [
      ['event_id', 'group_id'],
      ['event_member_id_a', 'group_member_id_a'],
      ['event_member_id_b', 'group_member_id_b'],
    ],
    shared_expenses: [['event_id', 'group_id']],
    group_debts: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
      ['debtor_event_member_id', 'debtor_group_member_id'],
      ['creditor_event_member_id', 'creditor_group_member_id'],
    ],
    payments: [
      ['payer_event_member_id', 'payer_group_member_id'],
      ['payee_event_member_id', 'payee_group_member_id'],
      ['event_id', 'group_id'],
    ],
    settlements: [['event_id', 'group_id']],
    expense_payers: [['event_member_id', 'group_member_id']],
    recurring_templates: [['event_id', 'group_id']],
    soft_reminders: [['related_event_id', 'related_group_id']],
    overpayment_credits: [
      ['payer_event_member_id', 'payer_group_member_id'],
      ['payee_event_member_id', 'payee_group_member_id'],
      ['event_id', 'group_id'],
    ],
    group_verification_responses: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
      ['event_member_id', 'group_member_id'],
    ],
    group_activity_logs: [
      ['event_id', 'group_id'],
      ['remote_event_id', 'remote_group_id'],
    ],
    attachments: [['event_id', 'group_id']],
    comments: [['event_id', 'group_id']],
    audit_logs: [['event_id', 'group_id']],
  };

  for (const [tableName, renames] of Object.entries(columnRenames)) {
    if (!(await tableExists(db, tableName))) {
      continue;
    }
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
    const columnNames = new Set(columns.map((column) => column.name));
    for (const [legacyName, groupName] of renames) {
      if (columnNames.has(legacyName) && !columnNames.has(groupName)) {
        await db.execAsync(`ALTER TABLE ${tableName} RENAME COLUMN ${legacyName} TO ${groupName}`);
        columnNames.delete(legacyName);
        columnNames.add(groupName);
      }
    }
  }
}

async function migrateLegacyGroupValues(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    UPDATE debts
    SET visibility = CASE visibility
      WHEN 'future_event_shared' THEN 'future_group_shared'
      WHEN 'shared_event' THEN 'shared_group'
      ELSE visibility
    END;
    UPDATE shared_expenses SET visibility = 'shared_group' WHERE visibility = 'shared_event';
    UPDATE recurring_templates SET type = 'group_debt' WHERE type = 'event_debt';
    UPDATE settlement_lines SET source_record_type = 'group_debt' WHERE source_record_type = 'event_debt';
    UPDATE attachments SET target_type = 'group' WHERE target_type = 'event';
    UPDATE comments SET target_type = 'group' WHERE target_type = 'event';
    UPDATE smart_suggestions SET suggestion_type = 'group' WHERE suggestion_type = 'event';
    UPDATE sync_queue
    SET entity_type = replace(entity_type, 'event', 'group')
    WHERE entity_type LIKE '%event%';
    UPDATE sync_conflicts
    SET entity_type = replace(entity_type, 'event', 'group'),
        conflict_type = CASE conflict_type
          WHEN 'event_locked' THEN 'group_locked'
          ELSE conflict_type
        END
    WHERE entity_type LIKE '%event%' OR conflict_type = 'event_locked';
    UPDATE notifications
    SET type = replace(type, 'event', 'group'),
        target_type = CASE target_type WHEN 'event' THEN 'group' ELSE target_type END
    WHERE type LIKE '%event%' OR target_type = 'event';
    UPDATE activity_log SET entity_kind = 'group' WHERE entity_kind = 'event';
    UPDATE audit_logs SET target_type = 'group' WHERE target_type = 'event';
  `);
}

async function tableExists(db: SQLite.SQLiteDatabase, tableName: string) {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName],
  );
  return Boolean(row);
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

/** Delete rebuildable domain and sync state, preserving onboarding and preferences. */
export async function resetSyncedData(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM sync_conflicts;
    DELETE FROM sync_queue;
    DELETE FROM group_activity_logs;
    DELETE FROM csv_import_batches;
    DELETE FROM export_logs;
    DELETE FROM smart_suggestions;
    DELETE FROM comments;
    DELETE FROM attachments;
    DELETE FROM group_verification_responses;
    DELETE FROM overpayment_credits;
    DELETE FROM soft_reminders;
    DELETE FROM reminders;
    DELETE FROM recurring_templates;
    DELETE FROM expense_payers;
    DELETE FROM settlement_lines;
    DELETE FROM settlements;
    DELETE FROM payments;
    DELETE FROM group_debts;
    DELETE FROM group_duplicate_warnings;
    DELETE FROM group_member_claims;
    DELETE FROM shared_group_members;
    DELETE FROM group_invites;
    DELETE FROM group_participants;
    DELETE FROM activity_log;
    DELETE FROM debt_verifications;
    DELETE FROM link_requests;
    DELETE FROM user_profiles;
    DELETE FROM shared_expenses;
    DELETE FROM debts;
    DELETE FROM group_members;
    DELETE FROM groups;
    DELETE FROM members;
    DELETE FROM tags;
  `);
}

/** Delete every local value. The auth session is cleared by the auth provider. */
export async function resetDatabase(db: SQLite.SQLiteDatabase) {
  await resetSyncedData(db);
  await db.execAsync(`
    DELETE FROM currency_rates;
    DELETE FROM app_settings;
  `);
  await initializeDefaults(db);
}

export async function initializeDefaults(db: SQLite.SQLiteDatabase) {
  const timestamp = nowIso();
  const existingFirstRunSetting = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = ?`,
    ['hasCompletedFirstRun'],
  );
  const firstRunDefault = existingFirstRunSetting
    ? existingFirstRunSetting.value
    : (await getDomainRecordCount(db)) > 0
      ? 'true'
      : 'false';
  const defaults: Record<keyof AppSettings, string> = {
    baseCurrency: DEFAULT_BASE_CURRENCY,
    hasCompletedFirstRun: firstRunDefault,
    localDisplayName: '',
    showEstimatedBase: 'true',
    theme: 'system',
    convertedSettlementOptIn: 'false',
    defaultReminderPreference: 'none',
    recurringGenerationPreference: 'prompt',
    includePendingSettlements: 'false',
    includeRejectedDisputedSettlements: 'false',
    verifiedOnlySettlements: 'false',
    smartSuggestionsEnabled: 'true',
    analyticsEstimatedCurrencyMode: 'false',
    attachmentUploadPreference: 'ask',
    includePrivateNotesInExports: 'false',
    includeRejectedDisputedInExports: 'false',
    includeArchivedInExports: 'false',
    includeCommentsInExports: 'false',
    includeAttachmentsInExports: 'false',
    defaultDebtVisibility: 'private',
    defaultGroupVisibility: 'private',
    showSensitiveDetailsInNotifications: 'false',
    syncPrivateLocalDataToAccountBackup: 'false',
    uploadAttachmentsForSharedRecords: 'false',
    analyticsIncludeRejectedDisputed: 'false',
    smartSuggestionsPrivateOnly: 'true',
    pushNotificationsEnabled: 'false',
    emailNotificationsEnabled: 'false',
    notificationVerificationEnabled: 'true',
    notificationGroupEnabled: 'true',
    notificationPaymentSettlementEnabled: 'true',
    notificationReminderEnabled: 'true',
    notificationCommentEnabled: 'false',
    quietHoursEnabled: 'false',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    language: 'system',
    backupIncludeAttachments: 'false',
    backupIncludePrivateNotes: 'false',
    betaTelemetryEnabled: 'true',
    betaCrashReportingEnabled: 'true',
    lastBackupAt: '',
  };

  for (const [key, value] of Object.entries(defaults)) {
    await db.runAsync(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
  }

  for (const [currency, rate] of Object.entries(DEFAULT_CURRENCY_RATES_TO_SEK)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO currency_rates (currency, rate_to_sek, updated_at) VALUES (?, ?, ?)`,
      [currency, rate, timestamp],
    );
  }
}

async function getDomainRecordCount(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT
      (SELECT COUNT(*) FROM members) +
      (SELECT COUNT(*) FROM debts) +
      (SELECT COUNT(*) FROM groups) +
      (SELECT COUNT(*) FROM shared_expenses) AS count`,
  );
  return row?.count ?? 0;
}

export async function loadSnapshot(db: SQLite.SQLiteDatabase): Promise<AppSnapshot> {
  const [
    profiles,
    members,
    debts,
    groups,
    groupMembers,
    groupParticipants,
    groupInvites,
    sharedGroupMembers,
    groupMemberClaims,
    groupDuplicateWarnings,
    sharedExpenses,
    groupDebts,
    payments,
    settlements,
    settlementLines,
    expensePayers,
    recurringTemplates,
    reminders,
    softReminders,
    overpaymentCredits,
    groupVerificationResponses,
    groupActivityLogs,
    linkRequests,
    debtVerifications,
    activityLogs,
    attachments,
    comments,
    smartSuggestions,
    exportLogs,
    csvImportBatches,
    syncQueue,
    syncConflicts,
    notifications,
    auditLogs,
    tags,
    currencyRates,
    settings,
  ] =
    await Promise.all([
      getProfiles(db),
      getMembers(db),
      getDebts(db),
      getGroups(db),
      getGroupMembers(db),
      getGroupParticipants(db),
      getGroupInvites(db),
      getSharedGroupMembers(db),
      getGroupMemberClaims(db),
      getGroupDuplicateWarnings(db),
      getSharedExpenses(db),
      getGroupDebts(db),
      getPayments(db),
      getSettlements(db),
      getSettlementLines(db),
      getExpensePayers(db),
      getRecurringTemplates(db),
      getReminders(db),
      getSoftReminders(db),
      getOverpaymentCredits(db),
      getGroupVerificationResponses(db),
      getGroupActivityLogs(db),
      getLinkRequests(db),
      getDebtVerifications(db),
      getActivityLogs(db),
      getAttachments(db),
      getComments(db),
      getSmartSuggestions(db),
      getExportLogs(db),
      getCsvImportBatches(db),
      getSyncQueue(db),
      getSyncConflicts(db),
      getNotifications(db),
      getAuditLogs(db),
      getTags(db),
      getCurrencyRates(db),
      getSettings(db),
    ]);

  return {
    profiles,
    members,
    debts,
    groups,
    groupMembers,
    groupParticipants,
    groupInvites,
    sharedGroupMembers,
    groupMemberClaims,
    groupDuplicateWarnings,
    sharedExpenses: sharedExpenses.map((expense) => ({
      ...expense,
      expensePayers: expensePayers.filter((payer) => payer.expenseId === expense.id),
    })),
    groupDebts,
    payments,
    settlements,
    settlementLines,
    expensePayers,
    recurringTemplates,
    reminders,
    softReminders,
    overpaymentCredits,
    groupVerificationResponses,
    groupActivityLogs,
    linkRequests,
    debtVerifications,
    activityLogs,
    attachments,
    comments,
    smartSuggestions,
    exportLogs,
    csvImportBatches,
    syncQueue,
    syncConflicts,
    notifications,
    auditLogs,
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

export async function getGroups(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupRow>(`SELECT * FROM groups ORDER BY updated_at DESC`);
  return rows.map(mapGroupRow);
}

export async function getGroupMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupMemberRow>(`SELECT * FROM group_members`);
  return rows.map((row) => ({
    groupId: row.group_id,
    memberId: row.member_id,
    createdAt: row.created_at,
  }));
}

export async function getGroupParticipants(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupParticipantRow>(`SELECT * FROM group_participants ORDER BY updated_at DESC`);
  return rows.map(mapGroupParticipantRow);
}

export async function getGroupInvites(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupInviteRow>(`SELECT * FROM group_invites ORDER BY updated_at DESC`);
  return rows.map(mapGroupInviteRow);
}

export async function getSharedGroupMembers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SharedGroupMemberRow>(
    `SELECT * FROM shared_group_members ORDER BY display_name COLLATE NOCASE`,
  );
  return rows.map(mapSharedGroupMemberRow);
}

export async function getGroupMemberClaims(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupMemberClaimRow>(`SELECT * FROM group_member_claims ORDER BY updated_at DESC`);
  return rows.map(mapGroupMemberClaimRow);
}

export async function getGroupDuplicateWarnings(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupDuplicateWarningRow>(
    `SELECT * FROM group_duplicate_warnings ORDER BY updated_at DESC`,
  );
  return rows.map(mapGroupDuplicateWarningRow);
}

export async function getSharedExpenses(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SharedExpenseRow>(
    `SELECT * FROM shared_expenses ORDER BY expense_date DESC, created_at DESC`,
  );
  return rows.map(mapSharedExpenseRow);
}

export async function getGroupDebts(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupDebtRow>(`SELECT * FROM group_debts ORDER BY debt_date DESC, created_at DESC`);
  return rows.map(mapGroupDebtRow);
}

export async function getPayments(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<PaymentRow>(`SELECT * FROM payments ORDER BY payment_date DESC, created_at DESC`);
  return rows.map(mapPaymentRow);
}

export async function getSettlements(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SettlementRow>(`SELECT * FROM settlements ORDER BY created_at DESC`);
  return rows.map(mapSettlementRow);
}

export async function getSettlementLines(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SettlementLineRow>(`SELECT * FROM settlement_lines ORDER BY created_at ASC`);
  return rows.map(mapSettlementLineRow);
}

export async function getExpensePayers(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<ExpensePayerRow>(`SELECT * FROM expense_payers ORDER BY created_at ASC`);
  return rows.map(mapExpensePayerRow);
}

export async function getRecurringTemplates(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<RecurringTemplateRow>(
    `SELECT * FROM recurring_templates ORDER BY next_occurrence_date ASC, updated_at DESC`,
  );
  return rows.map(mapRecurringTemplateRow);
}

export async function getReminders(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<ReminderRow>(`SELECT * FROM reminders ORDER BY remind_at ASC`);
  return rows.map(mapReminderRow);
}

export async function getSoftReminders(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SoftReminderRow>(`SELECT * FROM soft_reminders ORDER BY created_at DESC`);
  return rows.map(mapSoftReminderRow);
}

export async function getOverpaymentCredits(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<OverpaymentCreditRow>(
    `SELECT * FROM overpayment_credits ORDER BY created_at DESC`,
  );
  return rows.map(mapOverpaymentCreditRow);
}

export async function getGroupVerificationResponses(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupVerificationResponseRow>(
    `SELECT * FROM group_verification_responses ORDER BY updated_at DESC`,
  );
  return rows.map(mapGroupVerificationResponseRow);
}

export async function getGroupActivityLogs(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<GroupActivityLogRow>(
    `SELECT * FROM group_activity_logs ORDER BY created_at DESC LIMIT 500`,
  );
  return rows.map(mapGroupActivityLogRow);
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

export async function getAttachments(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<AttachmentRow>(
    `SELECT * FROM attachments ORDER BY created_at DESC`,
  );
  return rows.map(mapAttachmentRow);
}

export async function getComments(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<CommentRow>(
    `SELECT * FROM comments ORDER BY created_at ASC`,
  );
  return rows.map(mapCommentRow);
}

export async function getSmartSuggestions(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SmartSuggestionRow>(
    `SELECT * FROM smart_suggestions ORDER BY updated_at DESC`,
  );
  return rows.map(mapSmartSuggestionRow);
}

export async function getExportLogs(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<ExportLogRow>(
    `SELECT * FROM export_logs ORDER BY created_at DESC LIMIT 200`,
  );
  return rows.map(mapExportLogRow);
}

export async function getCsvImportBatches(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<CsvImportBatchRow>(
    `SELECT * FROM csv_import_batches ORDER BY updated_at DESC LIMIT 100`,
  );
  return rows.map(mapCsvImportBatchRow);
}

export async function getSyncQueue(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue ORDER BY
      CASE status
        WHEN 'running' THEN 0
        WHEN 'pending' THEN 1
        WHEN 'failed' THEN 2
        WHEN 'conflict' THEN 3
        ELSE 4
      END,
      created_at ASC
      LIMIT 300`,
  );
  return rows.map(mapSyncQueueRow);
}

export async function getSyncConflicts(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<SyncConflictRow>(
    `SELECT * FROM sync_conflicts ORDER BY
      CASE status WHEN 'unresolved' THEN 0 ELSE 1 END,
      detected_at DESC
      LIMIT 200`,
  );
  return rows.map(mapSyncConflictRow);
}

export async function getNotifications(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<NotificationRow>(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 300`,
  );
  return rows.map(mapNotificationRow);
}

export async function getAuditLogs(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<AuditLogRow>(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300`,
  );
  return rows.map(mapAuditLogRow);
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
    hasCompletedFirstRun: values.hasCompletedFirstRun === 'true',
    localDisplayName: values.localDisplayName && values.localDisplayName !== 'null' ? values.localDisplayName : null,
    showEstimatedBase: values.showEstimatedBase !== 'false',
    theme: values.theme === 'light' || values.theme === 'dark' ? values.theme : 'system',
    convertedSettlementOptIn: values.convertedSettlementOptIn === 'true',
    defaultReminderPreference:
      values.defaultReminderPreference === 'due_date' ||
      values.defaultReminderPreference === 'one_day_before' ||
      values.defaultReminderPreference === 'one_week_before'
        ? values.defaultReminderPreference
        : 'none',
    recurringGenerationPreference: values.recurringGenerationPreference === 'auto' ? 'auto' : 'prompt',
    includePendingSettlements: values.includePendingSettlements === 'true',
    includeRejectedDisputedSettlements: values.includeRejectedDisputedSettlements === 'true',
    verifiedOnlySettlements: values.verifiedOnlySettlements === 'true',
    smartSuggestionsEnabled: values.smartSuggestionsEnabled !== 'false',
    analyticsEstimatedCurrencyMode: values.analyticsEstimatedCurrencyMode === 'true',
    attachmentUploadPreference:
      values.attachmentUploadPreference === 'shared_only' || values.attachmentUploadPreference === 'never'
        ? values.attachmentUploadPreference
        : 'ask',
    includePrivateNotesInExports: values.includePrivateNotesInExports === 'true',
    includeRejectedDisputedInExports: values.includeRejectedDisputedInExports === 'true',
    includeArchivedInExports: values.includeArchivedInExports === 'true',
    includeCommentsInExports: values.includeCommentsInExports === 'true',
    includeAttachmentsInExports: values.includeAttachmentsInExports === 'true',
    defaultDebtVisibility:
      values.defaultDebtVisibility === 'shared_with_involved_member' ||
      values.defaultDebtVisibility === 'future_group_shared' ||
      values.defaultDebtVisibility === 'shared_group'
        ? values.defaultDebtVisibility
        : 'private',
    defaultGroupVisibility: values.defaultGroupVisibility === 'shared' ? 'shared' : 'private',
    showSensitiveDetailsInNotifications: values.showSensitiveDetailsInNotifications === 'true',
    syncPrivateLocalDataToAccountBackup: values.syncPrivateLocalDataToAccountBackup === 'true',
    uploadAttachmentsForSharedRecords: values.uploadAttachmentsForSharedRecords === 'true',
    analyticsIncludeRejectedDisputed: values.analyticsIncludeRejectedDisputed === 'true',
    smartSuggestionsPrivateOnly: values.smartSuggestionsPrivateOnly !== 'false',
    pushNotificationsEnabled: values.pushNotificationsEnabled === 'true',
    emailNotificationsEnabled: values.emailNotificationsEnabled === 'true',
    notificationVerificationEnabled: values.notificationVerificationEnabled !== 'false',
    notificationGroupEnabled: values.notificationGroupEnabled !== 'false',
    notificationPaymentSettlementEnabled: values.notificationPaymentSettlementEnabled !== 'false',
    notificationReminderEnabled: values.notificationReminderEnabled !== 'false',
    notificationCommentEnabled: values.notificationCommentEnabled === 'true',
    quietHoursEnabled: values.quietHoursEnabled === 'true',
    quietHoursStart: values.quietHoursStart || '22:00',
    quietHoursEnd: values.quietHoursEnd || '07:00',
    language: values.language === 'en' || values.language === 'sv' ? values.language : 'system',
    backupIncludeAttachments: values.backupIncludeAttachments === 'true',
    backupIncludePrivateNotes: values.backupIncludePrivateNotes === 'true',
    betaTelemetryEnabled: values.betaTelemetryEnabled !== 'false',
    betaCrashReportingEnabled: values.betaCrashReportingEnabled !== 'false',
    lastBackupAt: values.lastBackupAt && values.lastBackupAt !== 'null' ? values.lastBackupAt : null,
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
       currency, title, notes, shared_notes, debt_date, due_date, recurring_template_id, tags_json, group_id, status,
       verification_status, verified_by_user_id, verified_at, rejected_by_user_id, rejected_at,
       rejection_reason, dispute_reason, resolution_note, suggested_change_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      debt.recurringTemplateId,
      toJson(debt.tags),
      debt.groupId,
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

export async function insertGroup(db: SQLite.SQLiteDatabase, group: Group) {
  await db.runAsync(
    `INSERT OR REPLACE INTO groups
      (id, local_id, remote_id, owner_user_id, name, notes, default_currency, allowed_currencies_json,
       tags_json, status, visibility, sync_status, archived, archived_at, finalised_at, locked_at,
       ignored_duplicate_keys_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      group.id,
      group.localId,
      group.remoteId,
      group.ownerUserId,
      group.name,
      group.notes,
      group.defaultCurrency,
      toJson(group.allowedCurrencies),
      toJson(group.tags),
      group.status,
      group.visibility,
      group.syncStatus,
      group.archived ? 1 : 0,
      group.archivedAt,
      group.finalisedAt,
      group.lockedAt,
      toJson(group.ignoredDuplicateKeys),
      group.createdAt,
      group.updatedAt,
    ],
  );
  await upsertTagNames(db, group.tags);
}

export async function insertGroupMember(db: SQLite.SQLiteDatabase, groupMember: GroupMember) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_members (group_id, member_id, created_at) VALUES (?, ?, ?)`,
    [groupMember.groupId, groupMember.memberId, groupMember.createdAt],
  );
}

export async function insertGroupParticipant(db: SQLite.SQLiteDatabase, participant: GroupParticipant) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_participants
      (id, remote_id, group_id, remote_group_id, user_id, role, status, joined_at, created_at,
       updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      participant.id,
      participant.remoteId,
      participant.groupId,
      participant.remoteGroupId,
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

export async function insertGroupInvite(db: SQLite.SQLiteDatabase, invite: GroupInvite) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_invites
      (id, remote_id, group_id, remote_group_id, inviter_user_id, invited_user_id, invited_email,
       invited_phone, invited_display_name, offered_role, status, message, created_at, updated_at,
       responded_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invite.id,
      invite.remoteId,
      invite.groupId,
      invite.remoteGroupId,
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

export async function insertSharedGroupMember(db: SQLite.SQLiteDatabase, member: SharedGroupMember) {
  await db.runAsync(
    `INSERT OR REPLACE INTO shared_group_members
      (id, remote_id, group_id, remote_group_id, type, linked_user_id, display_name, alias,
       email, phone, notes, created_by_user_id, status, merged_into_group_member_id, created_at,
       updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member.id,
      member.remoteId,
      member.groupId,
      member.remoteGroupId,
      member.type,
      member.linkedUserId,
      member.displayName,
      member.alias,
      member.email,
      member.phone,
      member.notes,
      member.createdByUserId,
      member.status,
      member.mergedIntoGroupMemberId,
      member.createdAt,
      member.updatedAt,
      member.syncStatus,
    ],
  );
}

export async function insertGroupMemberClaim(db: SQLite.SQLiteDatabase, claim: GroupMemberClaim) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_member_claims
      (id, remote_id, group_id, remote_group_id, group_member_id, remote_group_member_id,
       claimant_user_id, status, message, responded_by_user_id, responded_at, created_at,
       updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      claim.id,
      claim.remoteId,
      claim.groupId,
      claim.remoteGroupId,
      claim.groupMemberId,
      claim.remoteGroupMemberId,
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

export async function insertGroupDuplicateWarning(db: SQLite.SQLiteDatabase, warning: GroupDuplicateWarning) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_duplicate_warnings
      (id, remote_id, group_id, group_member_id_a, group_member_id_b, reason, confidence,
       status, ignored_by_user_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      warning.id,
      warning.remoteId,
      warning.groupId,
      warning.groupMemberIdA,
      warning.groupMemberIdB,
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
      (id, remote_id, group_id, creator_user_id, payer_id, amount, currency, title, notes, expense_date,
       participant_ids_json, split_method, split_allocations_json, generated_obligations_json, due_date,
       recurring_template_id, tags_json, status,
       verification_status, visibility, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.remoteId,
      expense.groupId,
      expense.creatorUserId,
      expense.payerId,
      expense.amount,
      expense.currency,
      expense.title,
      expense.notes,
      expense.expenseDate,
      toJson(expense.participantIds),
      expense.splitMethod,
      toJson(expense.splitAllocations),
      toJson(expense.generatedObligations),
      expense.dueDate,
      expense.recurringTemplateId,
      toJson(expense.tags),
      expense.status,
      expense.verificationStatus,
      expense.visibility,
      expense.syncStatus,
      expense.createdAt,
      expense.updatedAt,
    ],
  );
  await db.runAsync(`DELETE FROM expense_payers WHERE expense_id = ?`, [expense.id]);
  const payers = expense.expensePayers.length
    ? expense.expensePayers
    : [
        {
          id: `${expense.id}_payer_${expense.payerId}`,
          expenseId: expense.id,
          groupMemberId: expense.payerId,
          amountPaid: expense.amount,
          currency: expense.currency,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        },
      ];
  for (const payer of payers) {
    await insertExpensePayer(db, payer);
  }
  await upsertTagNames(db, expense.tags);
}

export async function insertGroupDebt(db: SQLite.SQLiteDatabase, debt: GroupDebt) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_debts
      (id, remote_id, group_id, remote_group_id, creator_user_id, debtor_group_member_id,
       creditor_group_member_id, amount, currency, title, notes, debt_date, tags_json,
       due_date, verification_status, settlement_status, status, created_at, updated_at, archived_at,
       sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      debt.id,
      debt.remoteId,
      debt.groupId,
      debt.remoteGroupId,
      debt.creatorUserId,
      debt.debtorGroupMemberId,
      debt.creditorGroupMemberId,
      debt.amount,
      debt.currency,
      debt.title,
      debt.notes,
      debt.debtDate,
      toJson(debt.tags),
      debt.dueDate,
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

export async function insertGroupVerificationResponse(
  db: SQLite.SQLiteDatabase,
  response: GroupVerificationResponse,
) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_verification_responses
      (id, remote_id, group_id, remote_group_id, target_type, target_id, remote_target_id,
       group_member_id, linked_user_id, response_status, rejection_reason, responded_at,
       created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      response.id,
      response.remoteId,
      response.groupId,
      response.remoteGroupId,
      response.targetType,
      response.targetId,
      response.remoteTargetId,
      response.groupMemberId,
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

export async function insertGroupActivityLog(db: SQLite.SQLiteDatabase, activity: GroupActivityLog) {
  await db.runAsync(
    `INSERT OR REPLACE INTO group_activity_logs
      (id, remote_id, group_id, remote_group_id, actor_user_id, action, target_type, target_id,
       metadata_json, created_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activity.id,
      activity.remoteId,
      activity.groupId,
      activity.remoteGroupId,
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
      (id, first_name, last_name, display_name, email, phone, country, avatar_url, base_currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.firstName,
      profile.lastName,
      profile.displayName,
      profile.email,
      profile.phone,
      profile.country,
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
      (id, remote_id, debt_id, remote_debt_id, requester_user_id, responder_user_id,
       request_type, change_summary_json, status,
       rejection_reason, suggested_change_json, supersedes_verification_id, requested_at, responded_at, created_at, updated_at,
       sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      verification.id,
      verification.remoteId,
      verification.debtId,
      verification.remoteDebtId,
      verification.requesterUserId,
      verification.responderUserId,
      verification.requestType ?? 'creation',
      verification.changeSummary ? toJson(verification.changeSummary) : null,
      verification.status,
      verification.rejectionReason,
      verification.suggestedChange ? toJson(verification.suggestedChange) : null,
      verification.supersedesVerificationId,
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

export async function insertPayment(db: SQLite.SQLiteDatabase, payment: Payment) {
  await db.runAsync(
    `INSERT OR REPLACE INTO payments
      (id, local_id, remote_id, created_by_user_id, payer_user_id, payee_user_id, payer_member_id,
       payee_member_id, payer_group_member_id, payee_group_member_id, group_id, related_member_id,
       amount, currency, payment_date, notes, status, confirmation_status, visibility, created_at,
       updated_at, archived_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment.id,
      payment.localId,
      payment.remoteId,
      payment.createdByUserId,
      payment.payerUserId,
      payment.payeeUserId,
      payment.payerMemberId,
      payment.payeeMemberId,
      payment.payerGroupMemberId,
      payment.payeeGroupMemberId,
      payment.groupId,
      payment.relatedMemberId,
      payment.amount,
      payment.currency,
      payment.paymentDate,
      payment.notes,
      payment.status,
      payment.confirmationStatus,
      payment.visibility,
      payment.createdAt,
      payment.updatedAt,
      payment.archivedAt,
      payment.syncStatus,
    ],
  );
}

export async function insertSettlement(db: SQLite.SQLiteDatabase, settlement: Settlement) {
  await db.runAsync(
    `INSERT OR REPLACE INTO settlements
      (id, local_id, remote_id, created_by_user_id, group_id, member_id, type, currency, total_amount,
       status, confirmation_status, notes, original_currency, original_amount, settlement_currency,
       settlement_amount, exchange_rate_used, exchange_rate_date, conversion_note, created_at, updated_at,
       archived_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settlement.id,
      settlement.localId,
      settlement.remoteId,
      settlement.createdByUserId,
      settlement.groupId,
      settlement.memberId,
      settlement.type,
      settlement.currency,
      settlement.totalAmount,
      settlement.status,
      settlement.confirmationStatus,
      settlement.notes,
      settlement.originalCurrency,
      settlement.originalAmount,
      settlement.settlementCurrency,
      settlement.settlementAmount,
      settlement.exchangeRateUsed,
      settlement.exchangeRateDate,
      settlement.conversionNote,
      settlement.createdAt,
      settlement.updatedAt,
      settlement.archivedAt,
      settlement.syncStatus,
    ],
  );
}

export async function insertSettlementLine(db: SQLite.SQLiteDatabase, line: SettlementLine) {
  await db.runAsync(
    `INSERT OR REPLACE INTO settlement_lines
      (id, remote_id, settlement_id, payment_id, source_record_type, source_record_id, applied_amount,
       currency, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      line.id,
      line.remoteId ?? null,
      line.settlementId,
      line.paymentId,
      line.sourceRecordType,
      line.sourceRecordId,
      line.appliedAmount,
      line.currency,
      line.createdAt,
      line.updatedAt,
      line.syncStatus ?? 'local_only',
    ],
  );
}

export async function insertExpensePayer(db: SQLite.SQLiteDatabase, payer: ExpensePayer) {
  await db.runAsync(
    `INSERT OR REPLACE INTO expense_payers
      (id, expense_id, group_member_id, amount_paid, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payer.id,
      payer.expenseId,
      payer.groupMemberId,
      payer.amountPaid,
      payer.currency,
      payer.createdAt,
      payer.updatedAt,
    ],
  );
}

export async function insertRecurringTemplate(db: SQLite.SQLiteDatabase, template: RecurringTemplate) {
  await db.runAsync(
    `INSERT OR REPLACE INTO recurring_templates
      (id, created_by_user_id, group_id, member_id, type, title, amount, currency, recurrence_rule,
       start_date, end_date, next_occurrence_date, last_generated_date, status, auto_generate,
       reminder_settings_json, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.createdByUserId,
      template.groupId,
      template.memberId,
      template.type,
      template.title,
      template.amount,
      template.currency,
      template.recurrenceRule,
      template.startDate,
      template.endDate,
      template.nextOccurrenceDate,
      template.lastGeneratedDate,
      template.status,
      template.autoGenerate ? 1 : 0,
      template.reminderSettings ? toJson(template.reminderSettings) : null,
      toJson(template.payload),
      template.createdAt,
      template.updatedAt,
    ],
  );
}

export async function insertReminder(db: SQLite.SQLiteDatabase, reminder: Reminder) {
  await db.runAsync(
    `INSERT OR REPLACE INTO reminders
      (id, user_id, target_type, target_id, remind_at, repeat_rule, status, message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.userId,
      reminder.targetType,
      reminder.targetId,
      reminder.remindAt,
      reminder.repeatRule,
      reminder.status,
      reminder.message,
      reminder.createdAt,
      reminder.updatedAt,
    ],
  );
}

export async function insertSoftReminder(db: SQLite.SQLiteDatabase, reminder: SoftReminder) {
  await db.runAsync(
    `INSERT OR REPLACE INTO soft_reminders
      (id, sender_user_id, recipient_user_id, related_member_id, related_group_id, related_record_id,
       message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.senderUserId,
      reminder.recipientUserId,
      reminder.relatedMemberId,
      reminder.relatedGroupId,
      reminder.relatedRecordId,
      reminder.message,
      reminder.status,
      reminder.createdAt,
      reminder.updatedAt,
    ],
  );
}

export async function insertOverpaymentCredit(db: SQLite.SQLiteDatabase, credit: OverpaymentCredit) {
  await db.runAsync(
    `INSERT OR REPLACE INTO overpayment_credits
      (id, created_by_user_id, payer_member_id, payee_member_id, payer_group_member_id, payee_group_member_id,
       group_id, amount, currency, source_payment_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      credit.id,
      credit.createdByUserId,
      credit.payerMemberId,
      credit.payeeMemberId,
      credit.payerGroupMemberId,
      credit.payeeGroupMemberId,
      credit.groupId,
      credit.amount,
      credit.currency,
      credit.sourcePaymentId,
      credit.status,
      credit.createdAt,
      credit.updatedAt,
    ],
  );
}

export async function insertAttachment(db: SQLite.SQLiteDatabase, attachment: Attachment) {
  await db.runAsync(
    `INSERT OR REPLACE INTO attachments
      (id, remote_id, target_type, target_id, group_id, created_by_user_id, local_uri, remote_url, storage_path,
       file_name, file_type, mime_type, file_size, attachment_kind, visibility, thumbnail_uri,
       sync_status, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attachment.id,
      attachment.remoteId ?? null,
      attachment.targetType,
      attachment.targetId,
      attachment.groupId,
      attachment.createdByUserId,
      attachment.localUri,
      attachment.remoteUrl,
      attachment.storagePath,
      attachment.fileName,
      attachment.fileType,
      attachment.mimeType,
      attachment.fileSize,
      attachment.attachmentKind,
      attachment.visibility,
      attachment.thumbnailUri,
      attachment.syncStatus,
      attachment.createdAt,
      attachment.updatedAt,
      attachment.archivedAt,
    ],
  );
}

export async function insertComment(db: SQLite.SQLiteDatabase, comment: Comment) {
  await db.runAsync(
    `INSERT OR REPLACE INTO comments
      (id, remote_id, target_type, target_id, group_id, author_user_id, local_author_label, body, visibility,
       created_at, updated_at, deleted_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      comment.id,
      comment.remoteId ?? null,
      comment.targetType,
      comment.targetId,
      comment.groupId,
      comment.authorUserId,
      comment.localAuthorLabel,
      comment.body,
      comment.visibility,
      comment.createdAt,
      comment.updatedAt,
      comment.deletedAt,
      comment.syncStatus,
    ],
  );
}

export async function insertSmartSuggestion(db: SQLite.SQLiteDatabase, suggestion: SmartSuggestion) {
  await db.runAsync(
    `INSERT OR REPLACE INTO smart_suggestions
      (id, user_id, suggestion_type, target_type, target_id, title, message, metadata_json,
       status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      suggestion.id,
      suggestion.userId,
      suggestion.suggestionType,
      suggestion.targetType,
      suggestion.targetId,
      suggestion.title,
      suggestion.message,
      toJson(suggestion.metadata),
      suggestion.status,
      suggestion.createdAt,
      suggestion.updatedAt,
    ],
  );
}

export async function insertExportLog(db: SQLite.SQLiteDatabase, exportLog: ExportLog) {
  await db.runAsync(
    `INSERT OR REPLACE INTO export_logs
      (id, user_id, export_type, target_type, target_id, created_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      exportLog.id,
      exportLog.userId,
      exportLog.exportType,
      exportLog.targetType,
      exportLog.targetId,
      exportLog.createdAt,
      toJson(exportLog.metadata),
    ],
  );
}

export async function insertCsvImportBatch(db: SQLite.SQLiteDatabase, batch: CsvImportBatch) {
  await db.runAsync(
    `INSERT OR REPLACE INTO csv_import_batches
      (id, user_id, status, source_name, row_count, imported_member_count, imported_debt_count,
       error_count, created_at, updated_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batch.id,
      batch.userId,
      batch.status,
      batch.sourceName,
      batch.rowCount,
      batch.importedMemberCount,
      batch.importedDebtCount,
      batch.errorCount,
      batch.createdAt,
      batch.updatedAt,
      toJson(batch.metadata),
    ],
  );
}

export async function insertSyncQueueEntry(db: SQLite.SQLiteDatabase, entry: SyncQueueEntry) {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_queue
      (id, entity_type, entity_id, operation, payload_json, dependency_ids_json, retry_count, status,
       error_code, error_message, created_at, updated_at, last_attempt_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.entityType,
      entry.entityId,
      entry.operation,
      toJson(entry.payload),
      toJson(entry.dependencyIds),
      entry.retryCount,
      entry.status,
      entry.errorCode,
      entry.errorMessage,
      entry.createdAt,
      entry.updatedAt,
      entry.lastAttemptAt,
    ],
  );
}

export async function insertSyncConflict(db: SQLite.SQLiteDatabase, conflict: SyncConflict) {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_conflicts
      (id, entity_type, local_entity_id, remote_entity_id, conflict_type, local_snapshot_json,
       remote_snapshot_json, base_snapshot_json, detected_at, status, resolution, resolved_at,
       resolved_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conflict.id,
      conflict.entityType,
      conflict.localEntityId,
      conflict.remoteEntityId,
      conflict.conflictType,
      toJson(conflict.localSnapshot),
      toJson(conflict.remoteSnapshot),
      conflict.baseSnapshot ? toJson(conflict.baseSnapshot) : null,
      conflict.detectedAt,
      conflict.status,
      conflict.resolution,
      conflict.resolvedAt,
      conflict.resolvedByUserId,
    ],
  );
}

export async function insertNotification(db: SQLite.SQLiteDatabase, notification: AppNotification) {
  await db.runAsync(
    `INSERT OR REPLACE INTO notifications
      (id, user_id, type, title, body, target_type, target_id, read_at, created_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notification.id,
      notification.userId,
      notification.type,
      notification.title,
      notification.body,
      notification.targetType,
      notification.targetId,
      notification.readAt,
      notification.createdAt,
      toJson(notification.metadata),
    ],
  );
}

export async function insertAuditLog(db: SQLite.SQLiteDatabase, auditLog: AuditLog) {
  await db.runAsync(
    `INSERT OR REPLACE INTO audit_logs
      (id, actor_user_id, action, target_type, target_id, group_id, metadata_json, device_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      auditLog.id,
      auditLog.actorUserId,
      auditLog.action,
      auditLog.targetType,
      auditLog.targetId,
      auditLog.groupId,
      toJson(auditLog.metadata),
      auditLog.deviceId,
      auditLog.createdAt,
    ],
  );
}

export async function deleteGroupMember(db: SQLite.SQLiteDatabase, groupId: string, memberId: string) {
  await db.runAsync(`DELETE FROM group_members WHERE group_id = ? AND member_id = ?`, [groupId, memberId]);
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
