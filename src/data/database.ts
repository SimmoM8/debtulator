import * as SQLite from 'expo-sqlite';

import { DEFAULT_BASE_CURRENCY, DEFAULT_CURRENCY_RATES_TO_SEK } from '@/src/constants/currencies';
import type {
  AppSettings,
  ActivityLog,
  ActivityTargetKind,
  AppNotification,
  Attachment,
  AuditLog,
  CurrencyCode,
  CurrencyRate,
  Comment,
  CsvImportBatch,
  Debt,
  DebtVerification,
  ExportLog,
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
  ExpensePayer,
  LinkRequest,
  Member,
  OverpaymentCredit,
  ParticipantId,
  Payment,
  RecurringTemplate,
  Reminder,
  SharedEventMember,
  SharedExpense,
  Settlement,
  SettlementLine,
  SoftReminder,
  SmartSuggestion,
  SyncConflict,
  SyncQueueEntry,
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
  payments: Payment[];
  settlements: Settlement[];
  settlementLines: SettlementLine[];
  expensePayers: ExpensePayer[];
  recurringTemplates: RecurringTemplate[];
  reminders: Reminder[];
  softReminders: SoftReminder[];
  overpaymentCredits: OverpaymentCredit[];
  eventVerificationResponses: EventVerificationResponse[];
  eventActivityLogs: EventActivityLog[];
  linkRequests: LinkRequest[];
  debtVerifications: DebtVerification[];
  activityLogs: ActivityLog[];
  attachments: Attachment[];
  comments: Comment[];
  smartSuggestions: SmartSuggestion[];
  exportLogs: ExportLog[];
  csvImportBatches: CsvImportBatch[];
  syncQueue: SyncQueueEntry[];
  syncConflicts: SyncConflict[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
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
  recurring_template_id: string | null;
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
  split_allocations_json: string | null;
  generated_obligations_json: string | null;
  due_date: string | null;
  recurring_template_id: string | null;
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
  due_date: string | null;
  tags_json: string | null;
  verification_status: EventDebt['verificationStatus'];
  settlement_status: EventDebt['settlementStatus'];
  status: EventDebt['status'];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  sync_status: SyncStatus | null;
};

type PaymentRow = {
  id: string;
  local_id: string | null;
  remote_id: string | null;
  created_by_user_id: string | null;
  payer_user_id: string | null;
  payee_user_id: string | null;
  payer_member_id: string | null;
  payee_member_id: string | null;
  payer_event_member_id: string | null;
  payee_event_member_id: string | null;
  event_id: string | null;
  related_member_id: string | null;
  amount: number;
  currency: CurrencyCode;
  payment_date: string;
  notes: string | null;
  status: Payment['status'];
  confirmation_status: Payment['confirmationStatus'];
  visibility: Payment['visibility'];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  sync_status: SyncStatus | null;
};

type SettlementRow = {
  id: string;
  local_id: string | null;
  remote_id: string | null;
  created_by_user_id: string | null;
  event_id: string | null;
  member_id: string | null;
  type: Settlement['type'];
  currency: CurrencyCode;
  total_amount: number;
  status: Settlement['status'];
  confirmation_status: Settlement['confirmationStatus'];
  notes: string | null;
  original_currency: CurrencyCode | null;
  original_amount: number | null;
  settlement_currency: CurrencyCode | null;
  settlement_amount: number | null;
  exchange_rate_used: number | null;
  exchange_rate_date: string | null;
  conversion_note: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  sync_status: SyncStatus | null;
};

type SettlementLineRow = {
  id: string;
  remote_id?: string | null;
  settlement_id: string;
  payment_id: string | null;
  source_record_type: SettlementLine['sourceRecordType'];
  source_record_id: string;
  applied_amount: number;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
  sync_status?: SyncStatus | null;
};

type ExpensePayerRow = {
  id: string;
  expense_id: string;
  event_member_id: string;
  amount_paid: number;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
};

type RecurringTemplateRow = {
  id: string;
  created_by_user_id: string | null;
  event_id: string | null;
  member_id: string | null;
  type: RecurringTemplate['type'];
  title: string;
  amount: number;
  currency: CurrencyCode;
  recurrence_rule: string;
  start_date: string;
  end_date: string | null;
  next_occurrence_date: string;
  last_generated_date: string | null;
  status: RecurringTemplate['status'];
  auto_generate: number;
  reminder_settings_json: string | null;
  payload_json: string | null;
  created_at: string;
  updated_at: string;
};

type ReminderRow = {
  id: string;
  user_id: string | null;
  target_type: Reminder['targetType'];
  target_id: string;
  remind_at: string;
  repeat_rule: string | null;
  status: Reminder['status'];
  message: string;
  created_at: string;
  updated_at: string;
};

type SoftReminderRow = {
  id: string;
  sender_user_id: string | null;
  recipient_user_id: string | null;
  related_member_id: string | null;
  related_event_id: string | null;
  related_record_id: string | null;
  message: string;
  status: SoftReminder['status'];
  created_at: string;
  updated_at: string;
};

type OverpaymentCreditRow = {
  id: string;
  created_by_user_id: string | null;
  payer_member_id: string | null;
  payee_member_id: string | null;
  payer_event_member_id: string | null;
  payee_event_member_id: string | null;
  event_id: string | null;
  amount: number;
  currency: CurrencyCode;
  source_payment_id: string;
  status: OverpaymentCredit['status'];
  created_at: string;
  updated_at: string;
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

type AttachmentRow = {
  id: string;
  remote_id?: string | null;
  target_type: Attachment['targetType'];
  target_id: string;
  event_id: string | null;
  created_by_user_id: string | null;
  local_uri: string | null;
  remote_url: string | null;
  storage_path: string | null;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  attachment_kind: Attachment['attachmentKind'];
  visibility: Attachment['visibility'];
  thumbnail_uri: string | null;
  sync_status: SyncStatus | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type CommentRow = {
  id: string;
  remote_id?: string | null;
  target_type: Comment['targetType'];
  target_id: string;
  event_id: string | null;
  author_user_id: string | null;
  local_author_label: string | null;
  body: string;
  visibility: Comment['visibility'];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus | null;
};

type SmartSuggestionRow = {
  id: string;
  user_id: string | null;
  suggestion_type: SmartSuggestion['suggestionType'];
  target_type: SmartSuggestion['targetType'];
  target_id: string | null;
  title: string;
  message: string;
  metadata_json: string | null;
  status: SmartSuggestion['status'];
  created_at: string;
  updated_at: string;
};

type ExportLogRow = {
  id: string;
  user_id: string | null;
  export_type: ExportLog['exportType'];
  target_type: ExportLog['targetType'];
  target_id: string | null;
  created_at: string;
  metadata_json: string | null;
};

type CsvImportBatchRow = {
  id: string;
  user_id: string | null;
  status: CsvImportBatch['status'];
  source_name: string | null;
  row_count: number;
  imported_member_count: number;
  imported_debt_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
  metadata_json: string | null;
};

type SyncQueueRow = {
  id: string;
  entity_type: SyncQueueEntry['entityType'];
  entity_id: string;
  operation: SyncQueueEntry['operation'];
  payload_json: string | null;
  dependency_ids_json: string | null;
  retry_count: number;
  status: SyncQueueEntry['status'];
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  last_attempt_at: string | null;
};

type SyncConflictRow = {
  id: string;
  entity_type: SyncConflict['entityType'];
  local_entity_id: string;
  remote_entity_id: string | null;
  conflict_type: SyncConflict['conflictType'];
  local_snapshot_json: string | null;
  remote_snapshot_json: string | null;
  base_snapshot_json: string | null;
  detected_at: string;
  status: SyncConflict['status'];
  resolution: SyncConflict['resolution'];
  resolved_at: string | null;
  resolved_by_user_id: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: AppNotification['type'];
  title: string;
  body: string;
  target_type: AppNotification['targetType'];
  target_id: string | null;
  read_at: string | null;
  created_at: string;
  metadata_json: string | null;
};

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: AuditLog['targetType'];
  target_id: string | null;
  event_id: string | null;
  metadata_json: string | null;
  device_id: string | null;
  created_at: string;
};

const DB_NAME = 'debtulator-stage1.db';
const DEMO_SEEDING_SETTING_KEY = '__demoSeeding';
const DEMO_SEEDING_DISABLED = 'disabled';

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
      recurring_template_id TEXT,
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
      payer_event_member_id TEXT,
      payee_event_member_id TEXT,
      event_id TEXT,
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
      event_id TEXT,
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
      event_member_id TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id TEXT PRIMARY KEY NOT NULL,
      created_by_user_id TEXT,
      event_id TEXT,
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
      related_event_id TEXT,
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
      payer_event_member_id TEXT,
      payee_event_member_id TEXT,
      event_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      source_payment_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      event_id TEXT,
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
      event_id TEXT,
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
      event_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      device_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS audit_logs_target_idx
      ON audit_logs(target_type, target_id, created_at);

    CREATE INDEX IF NOT EXISTS audit_logs_event_idx
      ON audit_logs(event_id, created_at);

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

  await ensureColumn(db, 'shared_expenses', 'remote_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'creator_user_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'split_allocations_json', "TEXT NOT NULL DEFAULT '{}'");
  await ensureColumn(db, 'shared_expenses', 'due_date', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'recurring_template_id', 'TEXT');
  await ensureColumn(db, 'shared_expenses', 'visibility', "TEXT NOT NULL DEFAULT 'private'");
  await ensureColumn(db, 'shared_expenses', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");

  await ensureColumn(db, 'event_debts', 'due_date', 'TEXT');
  await ensureColumn(db, 'activity_log', 'actor_user_id', 'TEXT');
  await ensureColumn(db, 'settlement_lines', 'remote_id', 'TEXT');
  await ensureColumn(db, 'settlement_lines', 'sync_status', "TEXT NOT NULL DEFAULT 'local_only'");
  await ensureColumn(db, 'attachments', 'remote_id', 'TEXT');
  await ensureColumn(db, 'comments', 'remote_id', 'TEXT');

  for (const tableName of [
    'members',
    'debts',
    'events',
    'event_participants',
    'event_invites',
    'shared_event_members',
    'event_member_claims',
    'event_duplicate_warnings',
    'shared_expenses',
    'event_debts',
    'payments',
    'settlements',
    'settlement_lines',
    'attachments',
    'comments',
  ]) {
    await ensureColumn(db, tableName, 'last_synced_at', 'TEXT');
    await ensureColumn(db, tableName, 'remote_updated_at', 'TEXT');
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS members_sync_idx ON members(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS members_remote_idx ON members(remote_id);
    CREATE INDEX IF NOT EXISTS debts_member_idx ON debts(member_id, debt_date);
    CREATE INDEX IF NOT EXISTS debts_event_idx ON debts(event_id, debt_date);
    CREATE INDEX IF NOT EXISTS debts_sync_idx ON debts(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS debts_status_idx ON debts(status, verification_status);
    CREATE INDEX IF NOT EXISTS events_remote_idx ON events(remote_id);
    CREATE INDEX IF NOT EXISTS events_sync_idx ON events(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS shared_expenses_event_idx ON shared_expenses(event_id, expense_date);
    CREATE INDEX IF NOT EXISTS shared_expenses_sync_idx ON shared_expenses(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS event_debts_event_idx ON event_debts(event_id, debt_date);
    CREATE INDEX IF NOT EXISTS event_debts_sync_idx ON event_debts(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS payments_event_idx ON payments(event_id, payment_date);
    CREATE INDEX IF NOT EXISTS payments_sync_idx ON payments(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS payments_remote_idx ON payments(remote_id);
    CREATE INDEX IF NOT EXISTS settlements_event_idx ON settlements(event_id, created_at);
    CREATE INDEX IF NOT EXISTS settlements_sync_idx ON settlements(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS settlements_remote_idx ON settlements(remote_id);
    CREATE INDEX IF NOT EXISTS settlement_lines_remote_idx ON settlement_lines(remote_id);
    CREATE INDEX IF NOT EXISTS settlement_lines_sync_idx ON settlement_lines(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS event_participants_remote_idx ON event_participants(remote_id);
    CREATE INDEX IF NOT EXISTS event_invites_remote_idx ON event_invites(remote_id);
    CREATE INDEX IF NOT EXISTS shared_event_members_remote_idx ON shared_event_members(remote_id);
    CREATE INDEX IF NOT EXISTS event_member_claims_remote_idx ON event_member_claims(remote_id);
    CREATE INDEX IF NOT EXISTS shared_expenses_remote_idx ON shared_expenses(remote_id);
    CREATE INDEX IF NOT EXISTS event_debts_remote_idx ON event_debts(remote_id);
    CREATE INDEX IF NOT EXISTS event_verification_responses_remote_idx ON event_verification_responses(remote_id);
    CREATE INDEX IF NOT EXISTS comments_remote_idx ON comments(remote_id);
    CREATE INDEX IF NOT EXISTS comments_sync_idx ON comments(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS attachments_remote_idx ON attachments(remote_id);
    CREATE INDEX IF NOT EXISTS attachments_sync_idx ON attachments(sync_status, updated_at);
    CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders(status, remind_at);
    CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);
  `);
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
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM sync_conflicts;
    DELETE FROM sync_queue;
    DELETE FROM event_activity_logs;
    DELETE FROM csv_import_batches;
    DELETE FROM export_logs;
    DELETE FROM smart_suggestions;
    DELETE FROM comments;
    DELETE FROM attachments;
    DELETE FROM event_verification_responses;
    DELETE FROM overpayment_credits;
    DELETE FROM soft_reminders;
    DELETE FROM reminders;
    DELETE FROM recurring_templates;
    DELETE FROM expense_payers;
    DELETE FROM settlement_lines;
    DELETE FROM settlements;
    DELETE FROM payments;
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

  await seedDefaults(db);

  if (seed) {
    await seedDemoData(db);
  } else {
    await disableDemoSeeding(db);
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

  if ((row?.count ?? 0) === 0 && !(await isDemoSeedingDisabled(db))) {
    await seedDemoData(db);
  }
}

async function disableDemoSeeding(db: SQLite.SQLiteDatabase) {
  await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [
    DEMO_SEEDING_SETTING_KEY,
    DEMO_SEEDING_DISABLED,
  ]);
}

async function isDemoSeedingDisabled(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM app_settings WHERE key = ?`, [
    DEMO_SEEDING_SETTING_KEY,
  ]);
  return row?.value === DEMO_SEEDING_DISABLED;
}

export async function seedDefaults(db: SQLite.SQLiteDatabase) {
  const timestamp = nowIso();
  const defaults: Record<keyof AppSettings, string> = {
    baseCurrency: DEFAULT_BASE_CURRENCY,
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
    defaultEventVisibility: 'private',
    showSensitiveDetailsInNotifications: 'false',
    syncPrivateLocalDataToAccountBackup: 'false',
    uploadAttachmentsForSharedRecords: 'false',
    analyticsIncludeRejectedDisputed: 'false',
    smartSuggestionsPrivateOnly: 'true',
    pushNotificationsEnabled: 'false',
    emailNotificationsEnabled: 'false',
    notificationVerificationEnabled: 'true',
    notificationEventEnabled: 'true',
    notificationPaymentSettlementEnabled: 'true',
    notificationReminderEnabled: 'true',
    notificationCommentEnabled: 'false',
    quietHoursEnabled: 'false',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    language: 'system',
    backupIncludeAttachments: 'false',
    backupIncludePrivateNotes: 'false',
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
      recurringTemplateId: null,
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
      recurringTemplateId: null,
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
      recurringTemplateId: null,
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
      recurringTemplateId: null,
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
      expensePayers: [],
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
      splitAllocations: {},
      dueDate: null,
      recurringTemplateId: null,
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
      expensePayers: [],
      amount: 360,
      currency: 'EUR',
      title: 'Ski rentals',
      notes: 'Daniel paid for three rental sets.',
      expenseDate: todayIsoDate(),
      participantIds: ['event_member_ski_benjamin', 'event_member_ski_daniel', 'event_member_ski_sarah'],
      splitMethod: 'equal',
      splitAllocations: {},
      dueDate: null,
      recurringTemplateId: null,
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
      expensePayers: [],
      amount: 180,
      currency: 'USD',
      title: 'Utilities',
      notes: 'Manually marked disputed for the demo.',
      expenseDate: todayIsoDate(),
      participantIds: ['me', 'member_daniel', 'member_sarah'],
      splitMethod: 'equal',
      splitAllocations: {},
      dueDate: null,
      recurringTemplateId: null,
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
      dueDate: null,
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
  await insertAttachment(db, {
    id: 'attachment_demo_receipt_groceries',
    targetType: 'shared_expense',
    targetId: 'expense_ski_groceries',
    eventId: 'event_ski_sweden',
    createdByUserId: 'demo_user_local',
    localUri: null,
    remoteUrl: null,
    storagePath: 'events/event_ski_sweden/attachments/demo_receipt_groceries.jpg',
    fileName: 'cabin-groceries-receipt.jpg',
    fileType: 'image',
    mimeType: 'image/jpeg',
    fileSize: 184320,
    attachmentKind: 'receipt',
    visibility: 'shared',
    thumbnailUri: null,
    syncStatus: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  });
  await insertAttachment(db, {
    id: 'attachment_demo_proof_backpack',
    targetType: 'debt',
    targetId: 'debt_daniel_backpack',
    eventId: null,
    createdByUserId: 'demo_user_local',
    localUri: null,
    remoteUrl: null,
    storagePath: null,
    fileName: 'bank-transfer-proof.png',
    fileType: 'image',
    mimeType: 'image/png',
    fileSize: 96240,
    attachmentKind: 'proof',
    visibility: 'private',
    thumbnailUri: null,
    syncStatus: 'local_only',
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  });
  await insertComment(db, {
    id: 'comment_demo_event',
    targetType: 'event',
    targetId: 'event_ski_sweden',
    eventId: 'event_ski_sweden',
    authorUserId: 'demo_user_local',
    localAuthorLabel: 'Benjamin',
    body: 'I added groceries. Check if your split looks right before we settle.',
    visibility: 'shared',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: 'synced',
  });
  await insertComment(db, {
    id: 'comment_demo_debt',
    targetType: 'debt',
    targetId: 'debt_emma_rejected',
    eventId: 'event_ski_sweden',
    authorUserId: null,
    localAuthorLabel: 'Local note',
    body: 'Keep this private until Emma and I agree on which fee was shared.',
    visibility: 'private',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: 'local_only',
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
    payments,
    settlements,
    settlementLines,
    expensePayers,
    recurringTemplates,
    reminders,
    softReminders,
    overpaymentCredits,
    eventVerificationResponses,
    eventActivityLogs,
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
      getEvents(db),
      getEventMembers(db),
      getEventParticipants(db),
      getEventInvites(db),
      getSharedEventMembers(db),
      getEventMemberClaims(db),
      getEventDuplicateWarnings(db),
      getSharedExpenses(db),
      getEventDebts(db),
      getPayments(db),
      getSettlements(db),
      getSettlementLines(db),
      getExpensePayers(db),
      getRecurringTemplates(db),
      getReminders(db),
      getSoftReminders(db),
      getOverpaymentCredits(db),
      getEventVerificationResponses(db),
      getEventActivityLogs(db),
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
    events,
    eventMembers,
    eventParticipants,
    eventInvites,
    sharedEventMembers,
    eventMemberClaims,
    eventDuplicateWarnings,
    sharedExpenses: sharedExpenses.map((expense) => ({
      ...expense,
      expensePayers: expensePayers.filter((payer) => payer.expenseId === expense.id),
    })),
    eventDebts,
    payments,
    settlements,
    settlementLines,
    expensePayers,
    recurringTemplates,
    reminders,
    softReminders,
    overpaymentCredits,
    eventVerificationResponses,
    eventActivityLogs,
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
      values.defaultDebtVisibility === 'future_event_shared' ||
      values.defaultDebtVisibility === 'shared_event'
        ? values.defaultDebtVisibility
        : 'private',
    defaultEventVisibility: values.defaultEventVisibility === 'shared' ? 'shared' : 'private',
    showSensitiveDetailsInNotifications: values.showSensitiveDetailsInNotifications === 'true',
    syncPrivateLocalDataToAccountBackup: values.syncPrivateLocalDataToAccountBackup === 'true',
    uploadAttachmentsForSharedRecords: values.uploadAttachmentsForSharedRecords === 'true',
    analyticsIncludeRejectedDisputed: values.analyticsIncludeRejectedDisputed === 'true',
    smartSuggestionsPrivateOnly: values.smartSuggestionsPrivateOnly !== 'false',
    pushNotificationsEnabled: values.pushNotificationsEnabled === 'true',
    emailNotificationsEnabled: values.emailNotificationsEnabled === 'true',
    notificationVerificationEnabled: values.notificationVerificationEnabled !== 'false',
    notificationEventEnabled: values.notificationEventEnabled !== 'false',
    notificationPaymentSettlementEnabled: values.notificationPaymentSettlementEnabled !== 'false',
    notificationReminderEnabled: values.notificationReminderEnabled !== 'false',
    notificationCommentEnabled: values.notificationCommentEnabled === 'true',
    quietHoursEnabled: values.quietHoursEnabled === 'true',
    quietHoursStart: values.quietHoursStart || '22:00',
    quietHoursEnd: values.quietHoursEnd || '07:00',
    language: values.language === 'en' || values.language === 'sv' ? values.language : 'system',
    backupIncludeAttachments: values.backupIncludeAttachments === 'true',
    backupIncludePrivateNotes: values.backupIncludePrivateNotes === 'true',
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
       currency, title, notes, shared_notes, debt_date, due_date, recurring_template_id, tags_json, event_id, status,
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
       participant_ids_json, split_method, split_allocations_json, generated_obligations_json, due_date,
       recurring_template_id, tags_json, status,
       verification_status, visibility, sync_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          eventMemberId: expense.payerId,
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

export async function insertEventDebt(db: SQLite.SQLiteDatabase, debt: EventDebt) {
  await db.runAsync(
    `INSERT OR REPLACE INTO event_debts
      (id, remote_id, event_id, remote_event_id, creator_user_id, debtor_event_member_id,
       creditor_event_member_id, amount, currency, title, notes, debt_date, tags_json,
       due_date, verification_status, settlement_status, status, created_at, updated_at, archived_at,
       sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export async function insertPayment(db: SQLite.SQLiteDatabase, payment: Payment) {
  await db.runAsync(
    `INSERT OR REPLACE INTO payments
      (id, local_id, remote_id, created_by_user_id, payer_user_id, payee_user_id, payer_member_id,
       payee_member_id, payer_event_member_id, payee_event_member_id, event_id, related_member_id,
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
      payment.payerEventMemberId,
      payment.payeeEventMemberId,
      payment.eventId,
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
      (id, local_id, remote_id, created_by_user_id, event_id, member_id, type, currency, total_amount,
       status, confirmation_status, notes, original_currency, original_amount, settlement_currency,
       settlement_amount, exchange_rate_used, exchange_rate_date, conversion_note, created_at, updated_at,
       archived_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settlement.id,
      settlement.localId,
      settlement.remoteId,
      settlement.createdByUserId,
      settlement.eventId,
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
      (id, expense_id, event_member_id, amount_paid, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payer.id,
      payer.expenseId,
      payer.eventMemberId,
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
      (id, created_by_user_id, event_id, member_id, type, title, amount, currency, recurrence_rule,
       start_date, end_date, next_occurrence_date, last_generated_date, status, auto_generate,
       reminder_settings_json, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.createdByUserId,
      template.eventId,
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
      (id, sender_user_id, recipient_user_id, related_member_id, related_event_id, related_record_id,
       message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.senderUserId,
      reminder.recipientUserId,
      reminder.relatedMemberId,
      reminder.relatedEventId,
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
      (id, created_by_user_id, payer_member_id, payee_member_id, payer_event_member_id, payee_event_member_id,
       event_id, amount, currency, source_payment_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      credit.id,
      credit.createdByUserId,
      credit.payerMemberId,
      credit.payeeMemberId,
      credit.payerEventMemberId,
      credit.payeeEventMemberId,
      credit.eventId,
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
      (id, remote_id, target_type, target_id, event_id, created_by_user_id, local_uri, remote_url, storage_path,
       file_name, file_type, mime_type, file_size, attachment_kind, visibility, thumbnail_uri,
       sync_status, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attachment.id,
      attachment.remoteId ?? null,
      attachment.targetType,
      attachment.targetId,
      attachment.eventId,
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
      (id, remote_id, target_type, target_id, event_id, author_user_id, local_author_label, body, visibility,
       created_at, updated_at, deleted_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      comment.id,
      comment.remoteId ?? null,
      comment.targetType,
      comment.targetId,
      comment.eventId,
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
      (id, actor_user_id, action, target_type, target_id, event_id, metadata_json, device_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      auditLog.id,
      auditLog.actorUserId,
      auditLog.action,
      auditLog.targetType,
      auditLog.targetId,
      auditLog.eventId,
      toJson(auditLog.metadata),
      auditLog.deviceId,
      auditLog.createdAt,
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
    recurringTemplateId: row.recurring_template_id ?? null,
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
    expensePayers: [],
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    notes: row.notes,
    expenseDate: row.expense_date,
    participantIds: parseJsonArray(row.participant_ids_json),
    splitMethod: row.split_method,
    splitAllocations: parseJsonObject(row.split_allocations_json, {}) as Record<ParticipantId, number>,
    generatedObligations: parseJsonArray(row.generated_obligations_json),
    dueDate: row.due_date ?? null,
    recurringTemplateId: row.recurring_template_id ?? null,
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
    dueDate: row.due_date ?? null,
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

export function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    localId: row.local_id,
    remoteId: row.remote_id,
    createdByUserId: row.created_by_user_id,
    payerUserId: row.payer_user_id,
    payeeUserId: row.payee_user_id,
    payerMemberId: row.payer_member_id,
    payeeMemberId: row.payee_member_id,
    payerEventMemberId: row.payer_event_member_id,
    payeeEventMemberId: row.payee_event_member_id,
    eventId: row.event_id,
    relatedMemberId: row.related_member_id,
    amount: row.amount,
    currency: row.currency,
    paymentDate: row.payment_date,
    notes: row.notes,
    status: row.status,
    confirmationStatus: row.confirmation_status,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapSettlementRow(row: SettlementRow): Settlement {
  return {
    id: row.id,
    localId: row.local_id,
    remoteId: row.remote_id,
    createdByUserId: row.created_by_user_id,
    eventId: row.event_id,
    memberId: row.member_id,
    type: row.type,
    currency: row.currency,
    totalAmount: row.total_amount,
    status: row.status,
    confirmationStatus: row.confirmation_status,
    notes: row.notes,
    originalCurrency: row.original_currency,
    originalAmount: row.original_amount,
    settlementCurrency: row.settlement_currency,
    settlementAmount: row.settlement_amount,
    exchangeRateUsed: row.exchange_rate_used,
    exchangeRateDate: row.exchange_rate_date,
    conversionNote: row.conversion_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapSettlementLineRow(row: SettlementLineRow): SettlementLine {
  return {
    id: row.id,
    remoteId: row.remote_id ?? null,
    settlementId: row.settlement_id,
    paymentId: row.payment_id,
    sourceRecordType: row.source_record_type,
    sourceRecordId: row.source_record_id,
    appliedAmount: row.applied_amount,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapExpensePayerRow(row: ExpensePayerRow): ExpensePayer {
  return {
    id: row.id,
    expenseId: row.expense_id,
    eventMemberId: row.event_member_id,
    amountPaid: row.amount_paid,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecurringTemplateRow(row: RecurringTemplateRow): RecurringTemplate {
  return {
    id: row.id,
    createdByUserId: row.created_by_user_id,
    eventId: row.event_id,
    memberId: row.member_id,
    type: row.type,
    title: row.title,
    amount: row.amount,
    currency: row.currency,
    recurrenceRule: row.recurrence_rule,
    startDate: row.start_date,
    endDate: row.end_date,
    nextOccurrenceDate: row.next_occurrence_date,
    lastGeneratedDate: row.last_generated_date,
    status: row.status,
    autoGenerate: row.auto_generate === 1,
    reminderSettings: row.reminder_settings_json ? parseJsonObject(row.reminder_settings_json, {}) : null,
    payload: parseJsonObject(row.payload_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReminderRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    targetType: row.target_type,
    targetId: row.target_id,
    remindAt: row.remind_at,
    repeatRule: row.repeat_rule,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSoftReminderRow(row: SoftReminderRow): SoftReminder {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    recipientUserId: row.recipient_user_id,
    relatedMemberId: row.related_member_id,
    relatedEventId: row.related_event_id,
    relatedRecordId: row.related_record_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOverpaymentCreditRow(row: OverpaymentCreditRow): OverpaymentCredit {
  return {
    id: row.id,
    createdByUserId: row.created_by_user_id,
    payerMemberId: row.payer_member_id,
    payeeMemberId: row.payee_member_id,
    payerEventMemberId: row.payer_event_member_id,
    payeeEventMemberId: row.payee_event_member_id,
    eventId: row.event_id,
    amount: row.amount,
    currency: row.currency,
    sourcePaymentId: row.source_payment_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export function mapAttachmentRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    remoteId: row.remote_id ?? null,
    targetType: row.target_type,
    targetId: row.target_id,
    eventId: row.event_id,
    createdByUserId: row.created_by_user_id,
    localUri: row.local_uri,
    remoteUrl: row.remote_url,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileType: row.file_type,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    attachmentKind: row.attachment_kind,
    visibility: row.visibility,
    thumbnailUri: row.thumbnail_uri,
    syncStatus: row.sync_status ?? 'local_only',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    remoteId: row.remote_id ?? null,
    targetType: row.target_type,
    targetId: row.target_id,
    eventId: row.event_id,
    authorUserId: row.author_user_id,
    localAuthorLabel: row.local_author_label,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapSmartSuggestionRow(row: SmartSuggestionRow): SmartSuggestion {
  return {
    id: row.id,
    userId: row.user_id,
    suggestionType: row.suggestion_type,
    targetType: row.target_type,
    targetId: row.target_id,
    title: row.title,
    message: row.message,
    metadata: parseJsonObject(row.metadata_json, {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExportLogRow(row: ExportLogRow): ExportLog {
  return {
    id: row.id,
    userId: row.user_id,
    exportType: row.export_type,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at,
    metadata: parseJsonObject(row.metadata_json, {}),
  };
}

export function mapCsvImportBatchRow(row: CsvImportBatchRow): CsvImportBatch {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    sourceName: row.source_name,
    rowCount: row.row_count,
    importedMemberCount: row.imported_member_count,
    importedDebtCount: row.imported_debt_count,
    errorCount: row.error_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: parseJsonObject(row.metadata_json, {}),
  };
}

export function mapSyncQueueRow(row: SyncQueueRow): SyncQueueEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payload: parseJsonObject(row.payload_json, {}),
    dependencyIds: parseJsonArray(row.dependency_ids_json, []),
    retryCount: row.retry_count,
    status: row.status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAttemptAt: row.last_attempt_at,
  };
}

export function mapSyncConflictRow(row: SyncConflictRow): SyncConflict {
  return {
    id: row.id,
    entityType: row.entity_type,
    localEntityId: row.local_entity_id,
    remoteEntityId: row.remote_entity_id,
    conflictType: row.conflict_type,
    localSnapshot: parseJsonObject(row.local_snapshot_json, {}),
    remoteSnapshot: parseJsonObject(row.remote_snapshot_json, {}),
    baseSnapshot: row.base_snapshot_json ? parseJsonObject(row.base_snapshot_json, {}) : null,
    detectedAt: row.detected_at,
    status: row.status,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    resolvedByUserId: row.resolved_by_user_id,
  };
}

export function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    targetType: row.target_type,
    targetId: row.target_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    metadata: parseJsonObject(row.metadata_json, {}),
  };
}

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    eventId: row.event_id,
    metadata: parseJsonObject(row.metadata_json, {}),
    deviceId: row.device_id,
    createdAt: row.created_at,
  };
}
