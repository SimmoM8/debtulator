import type {
  ActivityLog,
  AppNotification,
  Attachment,
  AuditLog,
  Comment,
  CsvImportBatch,
  CurrencyCode,
  Debt,
  DebtVerification,
  ExportLog,
  ExpensePayer,
  Group,
  GroupActivityLog,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMemberClaim,
  GroupParticipant,
  GroupVerificationResponse,
  LinkRequest,
  Member,
  OverpaymentCredit,
  ParticipantId,
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
  UserProfile,
} from '@debtulator/domain/models';
import { parseJsonArray, parseJsonObject } from '@/src/infrastructure/sqlite/sqlJson';
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
  GroupParticipantRow,
  GroupRow,
  GroupVerificationResponseRow,
  LinkRequestRow,
  MemberRow,
  NotificationRow,
  OverpaymentCreditRow,
  PaymentRow,
  RecurringTemplateRow,
  ReminderRow,
  SharedExpenseRow,
  SharedGroupMemberRow,
  SettlementLineRow,
  SettlementRow,
  SmartSuggestionRow,
  SoftReminderRow,
  SyncConflictRow,
  SyncQueueRow,
  UserProfileRow,
} from '@/src/infrastructure/sqlite/rows';

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
    groupId: row.group_id,
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

export function mapGroupRow(row: GroupRow): Group {
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

export function mapGroupParticipantRow(row: GroupParticipantRow): GroupParticipant {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapGroupInviteRow(row: GroupInviteRow): GroupInvite {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
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

export function mapSharedGroupMemberRow(row: SharedGroupMemberRow): SharedGroupMember {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
    type: row.type,
    linkedUserId: row.linked_user_id,
    displayName: row.display_name,
    alias: row.alias,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    mergedIntoGroupMemberId: row.merged_into_group_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapGroupMemberClaimRow(row: GroupMemberClaimRow): GroupMemberClaim {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
    groupMemberId: row.group_member_id,
    remoteGroupMemberId: row.remote_group_member_id,
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

export function mapGroupDuplicateWarningRow(row: GroupDuplicateWarningRow): GroupDuplicateWarning {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    groupMemberIdA: row.group_member_id_a,
    groupMemberIdB: row.group_member_id_b,
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
    groupId: row.group_id,
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

export function mapGroupDebtRow(row: GroupDebtRow): GroupDebt {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
    creatorUserId: row.creator_user_id,
    debtorGroupMemberId: row.debtor_group_member_id,
    creditorGroupMemberId: row.creditor_group_member_id,
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
    payerGroupMemberId: row.payer_group_member_id,
    payeeGroupMemberId: row.payee_group_member_id,
    groupId: row.group_id,
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
    groupId: row.group_id,
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
    groupMemberId: row.group_member_id,
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
    groupId: row.group_id,
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
    relatedGroupId: row.related_group_id,
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
    payerGroupMemberId: row.payer_group_member_id,
    payeeGroupMemberId: row.payee_group_member_id,
    groupId: row.group_id,
    amount: row.amount,
    currency: row.currency,
    sourcePaymentId: row.source_payment_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGroupVerificationResponseRow(row: GroupVerificationResponseRow): GroupVerificationResponse {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
    targetType: row.target_type,
    targetId: row.target_id,
    remoteTargetId: row.remote_target_id,
    groupMemberId: row.group_member_id,
    linkedUserId: row.linked_user_id,
    responseStatus: row.response_status,
    rejectionReason: row.rejection_reason,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status ?? 'local_only',
  };
}

export function mapGroupActivityLogRow(row: GroupActivityLogRow): GroupActivityLog {
  return {
    id: row.id,
    remoteId: row.remote_id,
    groupId: row.group_id,
    remoteGroupId: row.remote_group_id,
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
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
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
    requestType: row.request_type ?? 'creation',
    changeSummary: row.change_summary_json
      ? (parseJsonObject(row.change_summary_json, {}) as DebtVerification['changeSummary'])
      : null,
    status: row.status,
    rejectionReason: row.rejection_reason,
    suggestedChange: row.suggested_change_json
      ? (parseJsonObject(row.suggested_change_json, {}) as DebtVerification['suggestedChange'])
      : null,
    supersedesVerificationId: row.supersedes_verification_id,
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
    groupId: row.group_id,
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
    groupId: row.group_id,
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
    groupId: row.group_id,
    metadata: parseJsonObject(row.metadata_json, {}),
    deviceId: row.device_id,
    createdAt: row.created_at,
  };
}
