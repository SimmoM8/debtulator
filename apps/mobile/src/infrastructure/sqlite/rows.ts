import type {
  ActivityTargetKind,
  AppNotification,
  Attachment,
  AuditLog,
  Comment,
  CsvImportBatch,
  CurrencyCode,
  Debt,
  DebtVerification,
  ExportLog,
  Group,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMemberClaim,
  GroupParticipant,
  GroupStatus,
  GroupVerificationResponse,
  LinkRequest,
  Member,
  OverpaymentCredit,
  Payment,
  RecurringTemplate,
  Reminder,
  SharedExpense,
  SharedGroupMember,
  Settlement,
  SettlementLine,
  SoftReminder,
  SmartSuggestion,
  SyncConflict,
  SyncQueueEntry,
  SyncStatus,
  VerificationStatus,
} from '@debtulator/domain/models';

export type MemberRow = {
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

export type DebtRow = {
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
  group_id: string | null;
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

export type GroupRow = {
  id: string;
  local_id: string | null;
  remote_id: string | null;
  owner_user_id: string | null;
  name: string;
  notes: string | null;
  default_currency: CurrencyCode;
  allowed_currencies_json: string | null;
  tags_json: string | null;
  status: GroupStatus;
  visibility: Group['visibility'] | null;
  sync_status: SyncStatus | null;
  archived: number;
  archived_at: string | null;
  finalised_at: string | null;
  locked_at: string | null;
  ignored_duplicate_keys_json: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupMemberRow = {
  group_id: string;
  member_id: string;
  created_at: string;
};

export type GroupParticipantRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  user_id: string;
  role: GroupParticipant['role'];
  status: GroupParticipant['status'];
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

export type GroupInviteRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  inviter_user_id: string;
  invited_user_id: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  invited_display_name: string;
  offered_role: GroupInvite['offeredRole'];
  status: GroupInvite['status'];
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  sync_status: SyncStatus | null;
};

export type SharedGroupMemberRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  type: SharedGroupMember['type'];
  linked_user_id: string | null;
  display_name: string;
  alias: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  status: SharedGroupMember['status'];
  merged_into_group_member_id: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

export type GroupMemberClaimRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  group_member_id: string;
  remote_group_member_id: string | null;
  claimant_user_id: string;
  status: GroupMemberClaim['status'];
  message: string | null;
  responded_by_user_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

export type GroupDuplicateWarningRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  group_member_id_a: string;
  group_member_id_b: string;
  reason: string;
  confidence: GroupDuplicateWarning['confidence'];
  status: GroupDuplicateWarning['status'];
  ignored_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

export type SharedExpenseRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
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

export type GroupDebtRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  creator_user_id: string | null;
  debtor_group_member_id: string;
  creditor_group_member_id: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  debt_date: string;
  due_date: string | null;
  tags_json: string | null;
  verification_status: GroupDebt['verificationStatus'];
  settlement_status: GroupDebt['settlementStatus'];
  status: GroupDebt['status'];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  sync_status: SyncStatus | null;
};

export type PaymentRow = {
  id: string;
  local_id: string | null;
  remote_id: string | null;
  created_by_user_id: string | null;
  payer_user_id: string | null;
  payee_user_id: string | null;
  payer_member_id: string | null;
  payee_member_id: string | null;
  payer_group_member_id: string | null;
  payee_group_member_id: string | null;
  group_id: string | null;
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

export type SettlementRow = {
  id: string;
  local_id: string | null;
  remote_id: string | null;
  created_by_user_id: string | null;
  group_id: string | null;
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

export type SettlementLineRow = {
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

export type ExpensePayerRow = {
  id: string;
  expense_id: string;
  group_member_id: string;
  amount_paid: number;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
};

export type RecurringTemplateRow = {
  id: string;
  created_by_user_id: string | null;
  group_id: string | null;
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

export type ReminderRow = {
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

export type SoftReminderRow = {
  id: string;
  sender_user_id: string | null;
  recipient_user_id: string | null;
  related_member_id: string | null;
  related_group_id: string | null;
  related_record_id: string | null;
  message: string;
  status: SoftReminder['status'];
  created_at: string;
  updated_at: string;
};

export type OverpaymentCreditRow = {
  id: string;
  created_by_user_id: string | null;
  payer_member_id: string | null;
  payee_member_id: string | null;
  payer_group_member_id: string | null;
  payee_group_member_id: string | null;
  group_id: string | null;
  amount: number;
  currency: CurrencyCode;
  source_payment_id: string;
  status: OverpaymentCredit['status'];
  created_at: string;
  updated_at: string;
};

export type GroupVerificationResponseRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  target_type: GroupVerificationResponse['targetType'];
  target_id: string;
  remote_target_id: string | null;
  group_member_id: string;
  linked_user_id: string | null;
  response_status: GroupVerificationResponse['responseStatus'];
  rejection_reason: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

export type GroupActivityLogRow = {
  id: string;
  remote_id: string | null;
  group_id: string;
  remote_group_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata_json: string | null;
  created_at: string;
  sync_status: SyncStatus | null;
};

export type TagRow = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type RateRow = {
  currency: CurrencyCode;
  rate_to_sek: number;
  updated_at: string;
};

export type SettingRow = {
  key: string;
  value: string;
};

export type UserProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
  base_currency: CurrencyCode;
  created_at: string;
  updated_at: string;
};

export type LinkRequestRow = {
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

export type DebtVerificationRow = {
  id: string;
  remote_id: string | null;
  debt_id: string;
  remote_debt_id: string | null;
  requester_user_id: string;
  responder_user_id: string;
  request_type: DebtVerification['requestType'] | null;
  change_summary_json: string | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  suggested_change_json: string | null;
  supersedes_verification_id: string | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus | null;
};

export type ActivityLogRow = {
  id: string;
  entity_kind: ActivityTargetKind;
  entity_id: string;
  actor_user_id: string | null;
  action: string;
  metadata_json: string | null;
  created_at: string;
};

export type AttachmentRow = {
  id: string;
  remote_id?: string | null;
  target_type: Attachment['targetType'];
  target_id: string;
  group_id: string | null;
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

export type CommentRow = {
  id: string;
  remote_id?: string | null;
  target_type: Comment['targetType'];
  target_id: string;
  group_id: string | null;
  author_user_id: string | null;
  local_author_label: string | null;
  body: string;
  visibility: Comment['visibility'];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus | null;
};

export type SmartSuggestionRow = {
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

export type ExportLogRow = {
  id: string;
  user_id: string | null;
  export_type: ExportLog['exportType'];
  target_type: ExportLog['targetType'];
  target_id: string | null;
  created_at: string;
  metadata_json: string | null;
};

export type CsvImportBatchRow = {
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

export type SyncQueueRow = {
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

export type SyncConflictRow = {
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

export type NotificationRow = {
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

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: AuditLog['targetType'];
  target_id: string | null;
  group_id: string | null;
  metadata_json: string | null;
  device_id: string | null;
  created_at: string;
};
