import type * as SQLite from 'expo-sqlite';

import {
  deleteGroupMember,
  insertAttachment,
  insertActivityLog,
  insertAuditLog,
  insertComment,
  insertCsvImportBatch,
  insertDebt,
  insertDebtVerification,
  insertGroup,
  insertGroupActivityLog,
  insertExportLog,
  insertGroupDebt,
  insertGroupDuplicateWarning,
  insertGroupMember,
  insertGroupMemberClaim,
  insertGroupParticipant,
  insertGroupInvite,
  insertGroupVerificationResponse,
  insertLinkRequest,
  insertMember,
  insertOverpaymentCredit,
  insertPayment,
  insertProfile,
  insertRecurringTemplate,
  insertReminder,
  insertSettlement,
  insertSettlementLine,
  insertSharedGroupMember,
  insertSharedExpense,
  insertSoftReminder,
  insertSmartSuggestion,
  insertSyncConflict,
  insertSyncQueueEntry,
  insertNotification,
  loadSnapshot,
  resetDatabase,
  resetSyncedData,
  updateCurrencyRate,
  updateSetting,
} from '@/src/data/database';
import { buildAccountDeletionPlan } from '@/src/services/accountDeletion';
import {
  canApplyRemoteSnapshot,
  getConflictResolutionAvailability,
  getRelatedSyncQueueEntries,
} from '@/src/data/conflictResolution';
import { buildRestorePlan, type RestoreResult } from '@/src/services/backupRestore';
import { withGeneratedObligations } from '@/src/services/splits';
import {
  buildDuplicateWarning,
  duplicatePairKey,
  findSharedGroupDuplicateWarningDrafts,
} from '@/src/services/groupDuplicates';
import type {
  AppSettings,
  AccountDeletionState,
  ActivityTargetKind,
  AppNotification,
  Attachment,
  AuditLog,
  AttachmentKind,
  AttachmentTargetType,
  AttachmentVisibility,
  Comment,
  CommentTargetType,
  CommentVisibility,
  CsvImportBatch,
  CurrencyCode,
  Debt,
  DebtChangeSummary,
  DebtVerification,
  DebtVerificationRequestType,
  DebtStatus,
  Group,
  GroupActivityLog,
  GroupDebt,
  GroupDuplicateWarning,
  GroupInvite,
  GroupMember,
  GroupMemberClaim,
  GroupParticipant,
  GroupRole,
  GroupStatus,
  GroupVerificationResponse,
  ExportLog,
  ExportType,
  ExpensePayer,
  LinkRequest,
  Member,
  MemberLinkStatus,
  ParticipantId,
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
  SmartSuggestionStatus,
  SmartSuggestionType,
  SuggestedDebtChange,
  BackupMode,
  ConflictResolution,
  SyncConflict,
  SyncQueueEntry,
  SyncStatus,
  VerificationStatus,
  UserProfile,
} from '@/src/types/models';
import { createId, nowIso, todayIsoDate } from '@/src/utils/id';

type MemberInput = {
  displayName: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedUserId?: string | null;
  linkStatus?: MemberLinkStatus;
  linkedProfileDisplayName?: string | null;
  linkedProfileEmail?: string | null;
  linkedProfilePhone?: string | null;
  tags?: string[];
};

type DebtInput = {
  memberId: string;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  sharedNotes?: string | null;
  debtDate?: string;
  dueDate?: string | null;
  recurringTemplateId?: string | null;
  tags?: string[];
  groupId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: Debt['visibility'];
};

type GroupInput = {
  name: string;
  notes?: string | null;
  defaultCurrency: CurrencyCode;
  allowedCurrencies?: CurrencyCode[];
  tags?: string[];
  status?: GroupStatus;
  visibility?: Group['visibility'];
  ownerUserId?: string | null;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
  remoteId?: string | null;
  ownerRemoteGroupMemberId?: string | null;
  syncStatus?: SyncStatus;
  memberIds?: string[];
};

type SharedExpenseInput = {
  groupId: string;
  creatorUserId?: string | null;
  payerId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  expenseDate?: string;
  participantIds: ParticipantId[];
  splitMethod?: SharedExpense['splitMethod'];
  splitAllocations?: Record<ParticipantId, number>;
  expensePayers?: { groupMemberId: ParticipantId; amountPaid: number }[];
  dueDate?: string | null;
  recurringTemplateId?: string | null;
  tags?: string[];
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: SharedExpense['visibility'];
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type GroupInviteInput = {
  groupId: string;
  remoteGroupId?: string | null;
  inviterUserId: string;
  invitedUserId?: string | null;
  invitedEmail?: string | null;
  invitedPhone?: string | null;
  invitedDisplayName: string;
  offeredRole: Exclude<GroupRole, 'owner'>;
  message?: string | null;
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type SharedGroupMemberInput = {
  groupId: string;
  remoteGroupId?: string | null;
  type?: SharedGroupMember['type'];
  linkedUserId?: string | null;
  displayName: string;
  alias?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  status?: SharedGroupMember['status'];
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type GroupDebtInput = {
  groupId: string;
  remoteGroupId?: string | null;
  creatorUserId?: string | null;
  debtorGroupMemberId: string;
  creditorGroupMemberId: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  debtDate?: string;
  dueDate?: string | null;
  tags?: string[];
  verificationStatus?: VerificationStatus;
  settlementStatus?: DebtStatus;
  status?: DebtStatus;
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type CreatePaymentInput = {
  payerId: ParticipantId;
  payeeId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  paymentDate?: string;
  notes?: string | null;
  groupId?: string | null;
  relatedMemberId?: string | null;
  visibility?: Payment['visibility'];
  status?: Payment['status'];
  confirmationStatus?: Payment['confirmationStatus'];
  createdByUserId?: string | null;
  payerUserId?: string | null;
  payeeUserId?: string | null;
  lines?: {
    sourceRecordType: SettlementLine['sourceRecordType'];
    sourceRecordId: string;
    appliedAmount: number;
  }[];
  settlementType?: Settlement['type'];
  settlementNotes?: string | null;
  convertedSettlement?: {
    originalCurrency: CurrencyCode;
    originalAmount: number;
    settlementCurrency: CurrencyCode;
    settlementAmount: number;
    exchangeRateUsed: number;
    exchangeRateDate: string;
    conversionNote: string;
  } | null;
};

type CreateRecurringTemplateInput = {
  createdByUserId?: string | null;
  groupId?: string | null;
  memberId?: string | null;
  type: RecurringTemplate['type'];
  title: string;
  amount: number;
  currency: CurrencyCode;
  recurrenceRule: string;
  startDate?: string;
  endDate?: string | null;
  nextOccurrenceDate?: string;
  autoGenerate?: boolean;
  reminderSettings?: Record<string, unknown> | null;
  payload: Record<string, unknown>;
};

type LinkMemberInput = {
  member: Member;
  requesterUserId: string;
  requesterDisplayName?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  message?: string | null;
  remoteId?: string | null;
};

type DebtVerificationInput = {
  debt: Debt;
  member: Member;
  requesterUserId: string;
  responderUserId: string;
  remoteDebtId?: string | null;
  remoteVerificationId?: string | null;
  sharedNotes?: string | null;
  requestType?: DebtVerificationRequestType;
  changeSummary?: DebtChangeSummary | null;
};

type AttachmentInput = {
  targetType: AttachmentTargetType;
  targetId: string;
  groupId?: string | null;
  createdByUserId?: string | null;
  localUri?: string | null;
  remoteUrl?: string | null;
  storagePath?: string | null;
  fileName: string;
  fileType?: string;
  mimeType?: string;
  fileSize?: number;
  attachmentKind: AttachmentKind;
  visibility?: AttachmentVisibility;
  thumbnailUri?: string | null;
  syncStatus?: SyncStatus;
};

type CommentInput = {
  targetType: CommentTargetType;
  targetId: string;
  groupId?: string | null;
  authorUserId?: string | null;
  localAuthorLabel?: string | null;
  body: string;
  visibility?: CommentVisibility;
  syncStatus?: SyncStatus;
};

type SmartSuggestionInput = {
  userId?: string | null;
  suggestionType: SmartSuggestionType;
  targetType?: SmartSuggestion['targetType'];
  targetId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  status?: SmartSuggestionStatus;
};

type ExportLogInput = {
  userId?: string | null;
  exportType: ExportType;
  targetType?: ExportLog['targetType'];
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

type CsvImportBatchInput = {
  userId?: string | null;
  status?: CsvImportBatch['status'];
  sourceName?: string | null;
  rowCount: number;
  importedMemberCount?: number;
  importedDebtCount?: number;
  errorCount?: number;
  metadata?: Record<string, unknown>;
};

export class DebtulatorRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async load() {
    return loadSnapshot(this.db);
  }

  async reset() {
    await resetDatabase(this.db);
  }

  async resetSyncedData() {
    await resetSyncedData(this.db);
  }

  async restoreBackup(rawJson: string, mode: BackupMode): Promise<RestoreResult> {
    const current = await loadSnapshot(this.db);
    const plan = buildRestorePlan(rawJson, current, mode);

    if (mode === 'replace_local') {
      await resetDatabase(this.db);
    }

    if (plan.settings) {
      await this.updateSettings(plan.settings);
    }
    for (const rate of plan.records.currencyRates) {
      await updateCurrencyRate(this.db, rate.currency, rate.rateToSek);
    }
    for (const profile of plan.records.profiles) {
      await insertProfile(this.db, profile);
    }
    for (const member of plan.records.members) {
      await insertMember(this.db, member);
    }
    for (const group of plan.records.groups) {
      await insertGroup(this.db, group);
    }
    for (const groupMember of plan.records.groupMembers) {
      await insertGroupMember(this.db, groupMember);
    }
    for (const member of plan.records.sharedGroupMembers) {
      await insertSharedGroupMember(this.db, member);
    }
    for (const debt of plan.records.debts) {
      await insertDebt(this.db, debt);
    }
    for (const expense of plan.records.sharedExpenses) {
      await insertSharedExpense(this.db, expense);
    }
    for (const debt of plan.records.groupDebts) {
      await insertGroupDebt(this.db, debt);
    }
    for (const payment of plan.records.payments) {
      await insertPayment(this.db, payment);
    }
    for (const settlement of plan.records.settlements) {
      await insertSettlement(this.db, settlement);
    }
    for (const line of plan.records.settlementLines) {
      await insertSettlementLine(this.db, line);
    }
    for (const template of plan.records.recurringTemplates) {
      await insertRecurringTemplate(this.db, template);
    }
    for (const reminder of plan.records.reminders) {
      await insertReminder(this.db, reminder);
    }
    for (const reminder of plan.records.softReminders) {
      await insertSoftReminder(this.db, reminder);
    }
    for (const credit of plan.records.overpaymentCredits) {
      await insertOverpaymentCredit(this.db, credit);
    }
    for (const comment of plan.records.comments) {
      await insertComment(this.db, comment);
    }
    for (const attachment of plan.records.attachments) {
      await insertAttachment(this.db, attachment);
    }
    for (const suggestion of plan.records.smartSuggestions) {
      await insertSmartSuggestion(this.db, suggestion);
    }
    for (const auditLog of plan.records.auditLogs) {
      await insertAuditLog(this.db, auditLog);
    }

    await this.createAuditLog({
      actorUserId: null,
      action: 'restore_performed',
      targetType: 'backup',
      targetId: null,
      groupId: null,
      metadata: {
        restoreMode: mode,
        restored: plan.result.restored,
        skipped: plan.result.skipped,
        warnings: plan.result.warnings,
      },
    });
    return plan.result;
  }

  async upsertSyncQueueEntry(entry: SyncQueueEntry) {
    await insertSyncQueueEntry(this.db, entry);
    return entry;
  }

  async upsertSyncConflict(conflict: SyncConflict) {
    await insertSyncConflict(this.db, conflict);
    return conflict;
  }

  async upsertNotification(notification: AppNotification) {
    await insertNotification(this.db, notification);
    return notification;
  }

  async upsertAuditLog(auditLog: AuditLog) {
    await insertAuditLog(this.db, auditLog);
    return auditLog;
  }

  async queueSyncOperation(input: {
    entityType: SyncQueueEntry['entityType'];
    entityId: string;
    operation: SyncQueueEntry['operation'];
    payload?: Record<string, unknown>;
    dependencyIds?: string[];
  }) {
    const timestamp = nowIso();
    const entry: SyncQueueEntry = {
      id: createId('sync_queue'),
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      payload: input.payload ?? {},
      dependencyIds: input.dependencyIds ?? [],
      retryCount: 0,
      status: 'pending',
      errorCode: null,
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastAttemptAt: null,
    };
    await insertSyncQueueEntry(this.db, entry);
    return entry;
  }

  async markSyncQueueEntry(entry: SyncQueueEntry, patch: Partial<SyncQueueEntry>) {
    const updated: SyncQueueEntry = {
      ...entry,
      ...patch,
      updatedAt: nowIso(),
    };
    await insertSyncQueueEntry(this.db, updated);
    return updated;
  }

  async createSyncConflict(input: Omit<SyncConflict, 'id' | 'detectedAt' | 'status' | 'resolution' | 'resolvedAt' | 'resolvedByUserId'>) {
    const conflict: SyncConflict = {
      ...input,
      id: createId('conflict'),
      detectedAt: nowIso(),
      status: 'unresolved',
      resolution: null,
      resolvedAt: null,
      resolvedByUserId: null,
    };
    await insertSyncConflict(this.db, conflict);
    await this.queueSyncOperation({
      entityType: input.entityType,
      entityId: input.localEntityId,
      operation: 'update',
      payload: { conflictId: conflict.id, blocked: true },
    });
    await this.createNotification({
      userId: null,
      type: 'sync_problem',
      title: 'Sync conflict needs review',
      body: `${input.entityType.replaceAll('_', ' ')} has competing local and remote changes.`,
      targetType: 'sync_conflict',
      targetId: conflict.id,
      metadata: { conflictType: conflict.conflictType },
    });
    return conflict;
  }

  async resolveSyncConflict(conflict: SyncConflict, resolution: ConflictResolution, actorUserId?: string | null) {
    const snapshot = await loadSnapshot(this.db);
    const availability = getConflictResolutionAvailability(conflict, snapshot);
    if (!availability[resolution]) {
      throw new Error(`Resolution "${resolution}" is not supported for this conflict.`);
    }

    if (resolution === 'cancel_local_change') {
      await this.cancelRelatedSyncQueueEntries(conflict, snapshot.syncQueue);
    } else if (resolution === 'keep_mine') {
      await this.requeueRelatedSyncQueueEntries(conflict, snapshot.syncQueue);
    } else if (resolution === 'keep_theirs') {
      await this.applyRemoteSnapshot(conflict);
      await this.cancelRelatedSyncQueueEntries(conflict, snapshot.syncQueue);
    }

    const resolved: SyncConflict = {
      ...conflict,
      status: 'resolved',
      resolution,
      resolvedAt: nowIso(),
      resolvedByUserId: actorUserId ?? null,
    };
    await insertSyncConflict(this.db, resolved);
    await this.createAuditLog({
      actorUserId: actorUserId ?? null,
      action: 'conflict_resolved',
      targetType: 'sync_conflict',
      targetId: conflict.id,
      groupId: null,
      metadata: {
        entityType: conflict.entityType,
        localEntityId: conflict.localEntityId,
        remoteEntityId: conflict.remoteEntityId,
        resolution,
      },
    });
    return resolved;
  }

  private async cancelRelatedSyncQueueEntries(conflict: SyncConflict, syncQueue: SyncQueueEntry[]) {
    const timestamp = nowIso();
    const relatedEntries = getRelatedSyncQueueEntries(syncQueue, conflict).filter((entry) =>
      ['pending', 'running', 'failed', 'conflict'].includes(entry.status),
    );
    for (const entry of relatedEntries) {
      await insertSyncQueueEntry(this.db, {
        ...entry,
        status: 'cancelled',
        errorCode: null,
        errorMessage: 'Cancelled during conflict resolution.',
        updatedAt: timestamp,
      });
    }
  }

  private async requeueRelatedSyncQueueEntries(conflict: SyncConflict, syncQueue: SyncQueueEntry[]) {
    const timestamp = nowIso();
    const relatedEntries = getRelatedSyncQueueEntries(syncQueue, conflict).filter((entry) =>
      ['pending', 'running', 'failed', 'conflict'].includes(entry.status),
    );
    if (!relatedEntries.length) {
      throw new Error('No related sync work can be requeued for this conflict.');
    }
    for (const entry of relatedEntries) {
      await insertSyncQueueEntry(this.db, {
        ...entry,
        payload: withoutConflictBlockers(entry.payload),
        retryCount: 0,
        status: 'pending',
        errorCode: null,
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAttemptAt: null,
      });
    }
  }

  private async applyRemoteSnapshot(conflict: SyncConflict) {
    if (!canApplyRemoteSnapshot(conflict)) {
      throw new Error('The remote snapshot cannot be safely applied to this local record.');
    }
    const remoteSnapshot = {
      ...conflict.remoteSnapshot,
      id: conflict.localEntityId,
      remoteId: conflict.remoteEntityId ?? conflict.remoteSnapshot.remoteId ?? null,
      syncStatus: 'synced',
    };

    switch (conflict.entityType) {
      case 'member':
        await insertMember(this.db, remoteSnapshot as Member);
        return;
      case 'debt':
        await insertDebt(this.db, remoteSnapshot as Debt);
        return;
      case 'group':
        await insertGroup(this.db, remoteSnapshot as Group);
        return;
      case 'shared_expense':
        await insertSharedExpense(this.db, remoteSnapshot as SharedExpense);
        return;
      case 'group_invite':
        await insertGroupInvite(this.db, remoteSnapshot as GroupInvite);
        return;
      case 'group_member':
        await insertSharedGroupMember(this.db, remoteSnapshot as SharedGroupMember);
        return;
      case 'group_member_claim':
        await insertGroupMemberClaim(this.db, remoteSnapshot as GroupMemberClaim);
        return;
      case 'group_duplicate_warning':
        await insertGroupDuplicateWarning(this.db, remoteSnapshot as GroupDuplicateWarning);
        return;
      case 'group_debt':
        await insertGroupDebt(this.db, remoteSnapshot as GroupDebt);
        return;
      case 'group_verification':
        await insertGroupVerificationResponse(this.db, remoteSnapshot as GroupVerificationResponse);
        return;
      case 'payment':
        await insertPayment(this.db, remoteSnapshot as Payment);
        return;
      case 'settlement':
        await insertSettlement(this.db, remoteSnapshot as Settlement);
        return;
      case 'attachment':
        await insertAttachment(this.db, remoteSnapshot as Attachment);
        return;
      case 'comment':
        await insertComment(this.db, remoteSnapshot as Comment);
        return;
      default:
        throw new Error(`Cannot apply remote snapshots for ${conflict.entityType} conflicts.`);
    }
  }

  async createNotification(input: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'> & { readAt?: string | null }) {
    const notification: AppNotification = {
      ...input,
      id: createId('notification'),
      readAt: input.readAt ?? null,
      createdAt: nowIso(),
    };
    await insertNotification(this.db, notification);
    return notification;
  }

  async markNotificationRead(notification: AppNotification, readAt = nowIso()) {
    const updated = { ...notification, readAt };
    await insertNotification(this.db, updated);
    return updated;
  }

  async createAuditLog(input: Omit<AuditLog, 'id' | 'createdAt' | 'deviceId'> & { deviceId?: string | null }) {
    const auditLog: AuditLog = {
      ...input,
      id: createId('audit'),
      deviceId: input.deviceId ?? null,
      createdAt: nowIso(),
    };
    await insertAuditLog(this.db, auditLog);
    return auditLog;
  }

  async submitAccountDeletionRequest(input: {
    userId: string;
    deleteLocalData: boolean;
    keepLocalArchive: boolean;
  }): Promise<AccountDeletionState> {
    const requestId = createId('account_deletion');
    const requestLog = await this.createAuditLog({
      actorUserId: input.userId,
      action: 'account_deletion_requested',
      targetType: 'account',
      targetId: input.userId,
      groupId: null,
      metadata: {
        requestId,
        deleteLocalData: input.deleteLocalData,
        keepLocalArchive: input.keepLocalArchive,
      },
    });

    const snapshot = await this.load();
    const plan = buildAccountDeletionPlan(snapshot, input.userId);
    if (plan.blockers.length > 0) {
      const failureReason = plan.blockers.join(',');
      const failedAt = nowIso();
      await this.createAuditLog({
        actorUserId: input.userId,
        action: 'account_deletion_failed',
        targetType: 'account',
        targetId: input.userId,
        groupId: null,
        metadata: {
          requestId,
          failureReason,
          unresolvedOwnedConflictCount: plan.unresolvedOwnedConflictCount,
        },
      });
      return {
        requestId,
        userId: input.userId,
        status: 'failed',
        requestedAt: requestLog.createdAt,
        processedAt: failedAt,
        failureReason,
        metadata: {
          unresolvedOwnedConflictCount: plan.unresolvedOwnedConflictCount,
        },
      };
    }

    const timestamp = nowIso();
    for (const profile of snapshot.profiles.filter((item) => item.id === input.userId)) {
      await insertProfile(this.db, {
        ...profile,
        displayName: 'Deleted user',
        email: null,
        phone: null,
        avatarUrl: null,
        updatedAt: timestamp,
      });
    }

    for (const group of snapshot.groups.filter((item) => item.ownerUserId === input.userId)) {
      await insertGroup(this.db, {
        ...group,
        ownerUserId: null,
        updatedAt: timestamp,
      });
    }

    for (const participant of snapshot.groupParticipants.filter((item) => item.userId === input.userId)) {
      await insertGroupParticipant(this.db, {
        ...participant,
        status: 'removed',
        updatedAt: timestamp,
      });
    }

    for (const member of snapshot.sharedGroupMembers.filter((item) => item.linkedUserId === input.userId)) {
      await insertSharedGroupMember(this.db, {
        ...member,
        type: 'unlinked_placeholder',
        linkedUserId: null,
        displayName: 'Deleted user',
        alias: null,
        email: null,
        phone: null,
        notes: null,
        updatedAt: timestamp,
      });
    }

    for (const member of snapshot.members.filter((item) => item.linkedUserId === input.userId)) {
      await insertMember(this.db, {
        ...member,
        linkedUserId: null,
        linkStatus: 'unlinked',
        linkedProfileDisplayName: null,
        linkedProfileEmail: null,
        linkedProfilePhone: null,
        updatedAt: timestamp,
      });
    }

    for (const attachment of snapshot.attachments.filter((item) => item.createdByUserId === input.userId)) {
      const extension = attachment.fileType?.trim() ? `.${attachment.fileType.trim()}` : '';
      await insertAttachment(this.db, {
        ...attachment,
        createdByUserId: null,
        localUri: null,
        remoteUrl: null,
        storagePath: null,
        thumbnailUri: null,
        fileName: `deleted-${attachment.id}${extension}`,
        archivedAt: attachment.archivedAt ?? timestamp,
        updatedAt: timestamp,
      });
    }

    for (const comment of snapshot.comments.filter((item) => item.authorUserId === input.userId)) {
      await insertComment(this.db, {
        ...comment,
        authorUserId: null,
        localAuthorLabel: 'Deleted user',
        updatedAt: timestamp,
      });
    }

    await this.db.runAsync(`DELETE FROM notifications WHERE user_id = ?`, [input.userId]);
    await this.db.runAsync(`UPDATE reminders SET user_id = NULL WHERE user_id = ?`, [input.userId]);
    await this.db.runAsync(`UPDATE soft_reminders SET sender_user_id = NULL WHERE sender_user_id = ?`, [input.userId]);
    await this.db.runAsync(`UPDATE soft_reminders SET recipient_user_id = NULL WHERE recipient_user_id = ?`, [input.userId]);

    const notificationSettings: (keyof AppSettings)[] = [
      'pushNotificationsEnabled',
      'emailNotificationsEnabled',
      'notificationVerificationEnabled',
      'notificationGroupEnabled',
      'notificationPaymentSettlementEnabled',
      'notificationReminderEnabled',
      'notificationCommentEnabled',
    ];
    for (const key of notificationSettings) {
      await updateSetting(this.db, key, 'false');
    }

    const processedAt = nowIso();
    await this.createAuditLog({
      actorUserId: input.userId,
      action: 'account_deletion_completed',
      targetType: 'account',
      targetId: input.userId,
      groupId: null,
      metadata: {
        requestId,
        ownedGroupCount: plan.ownedGroupCount,
        ownedAttachmentCount: plan.ownedAttachmentCount,
      },
    });
    return {
      requestId,
      userId: input.userId,
      status: 'completed',
      requestedAt: requestLog.createdAt,
      processedAt,
      failureReason: null,
      metadata: {
        ownedGroupCount: plan.ownedGroupCount,
        ownedAttachmentCount: plan.ownedAttachmentCount,
      },
    };
  }

  async createMember(input: MemberInput) {
    const timestamp = nowIso();
    const member: Member = {
      id: createId('member'),
      displayName: input.displayName.trim(),
      notes: cleanOptional(input.notes),
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      remoteId: null,
      linkedUserId: cleanOptional(input.linkedUserId),
      linkStatus: input.linkStatus ?? 'unlinked',
      linkRequestId: null,
      linkedProfileDisplayName: cleanOptional(input.linkedProfileDisplayName),
      linkedProfileEmail: cleanOptional(input.linkedProfileEmail),
      linkedProfilePhone: cleanOptional(input.linkedProfilePhone),
      syncStatus: 'local_only',
      tags: cleanTags(input.tags),
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertMember(this.db, member);
    return member;
  }

  async updateMember(member: Member, input: Partial<MemberInput> & { archived?: boolean }) {
    const updated: Member = {
      ...member,
      displayName: input.displayName?.trim() ?? member.displayName,
      notes: input.notes === undefined ? member.notes : cleanOptional(input.notes),
      email: input.email === undefined ? member.email : cleanOptional(input.email),
      phone: input.phone === undefined ? member.phone : cleanOptional(input.phone),
      linkedUserId: input.linkedUserId === undefined ? member.linkedUserId : cleanOptional(input.linkedUserId),
      linkStatus: input.linkStatus ?? member.linkStatus,
      linkedProfileDisplayName:
        input.linkedProfileDisplayName === undefined
          ? member.linkedProfileDisplayName
          : cleanOptional(input.linkedProfileDisplayName),
      linkedProfileEmail:
        input.linkedProfileEmail === undefined ? member.linkedProfileEmail : cleanOptional(input.linkedProfileEmail),
      linkedProfilePhone:
        input.linkedProfilePhone === undefined ? member.linkedProfilePhone : cleanOptional(input.linkedProfilePhone),
      tags: input.tags === undefined ? member.tags : cleanTags(input.tags),
      archived: input.archived ?? member.archived,
      updatedAt: nowIso(),
    };
    await insertMember(this.db, updated);
    return updated;
  }

  async createDebt(input: DebtInput) {
    const timestamp = nowIso();
    const debt: Debt = {
      id: createId('debt'),
      type: 'simple',
      memberId: input.memberId,
      remoteId: null,
      verificationRequestId: null,
      visibility: input.visibility ?? 'private',
      syncStatus: input.visibility === 'shared_with_involved_member' ? 'pending_upload' : 'local_only',
      direction: input.direction,
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      sharedNotes: cleanOptional(input.sharedNotes),
      debtDate: input.debtDate || todayIsoDate(),
      dueDate: cleanOptional(input.dueDate),
      recurringTemplateId: cleanOptional(input.recurringTemplateId),
      tags: cleanTags(input.tags),
      groupId: input.groupId ?? null,
      status: input.status ?? 'active',
      verificationStatus: input.verificationStatus ?? 'local_only',
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
    };
    await insertDebt(this.db, debt);
    if (debt.syncStatus === 'pending_upload' || debt.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'debt', entityId: debt.id, operation: 'create', payload: debt });
    }
    return debt;
  }

  async updateDebt(
    debt: Debt,
    input: Partial<DebtInput>,
    actorUserId: string | null = null,
  ) {
    const reviewFieldsChanged =
      (input.amount !== undefined && toAmount(input.amount) !== debt.amount) ||
      (input.direction !== undefined && input.direction !== debt.direction) ||
      (input.title !== undefined && input.title.trim() !== debt.title) ||
      (input.memberId !== undefined && input.memberId !== debt.memberId) ||
      (input.status !== undefined &&
        input.status !== 'settled' &&
        input.status !== debt.status) ||
      (input.dueDate !== undefined &&
        cleanOptional(input.dueDate) !== debt.dueDate);
    const requiresSharedApproval =
      debt.visibility === 'shared_with_involved_member' && reviewFieldsChanged;

    const nextVerificationStatus =
      ['pending', 'verified', 'rejected', 'disputed', 'resolved'].includes(debt.verificationStatus) && reviewFieldsChanged
        ? debt.visibility === 'shared_with_involved_member'
          ? 'pending'
          : 'local_only'
        : input.verificationStatus ?? debt.verificationStatus;

    const updated: Debt = {
      ...debt,
      memberId: input.memberId ?? debt.memberId,
      visibility: input.visibility ?? debt.visibility,
      syncStatus:
        requiresSharedApproval
          ? debt.syncStatus
          : reviewFieldsChanged && debt.syncStatus === 'synced'
          ? 'pending_update'
          : input.visibility === 'shared_with_involved_member' && debt.syncStatus === 'local_only'
            ? 'pending_upload'
            : debt.syncStatus,
      direction: input.direction ?? debt.direction,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      sharedNotes: input.sharedNotes === undefined ? debt.sharedNotes : cleanOptional(input.sharedNotes),
      debtDate: debt.debtDate,
      dueDate: input.dueDate === undefined ? debt.dueDate : cleanOptional(input.dueDate),
      recurringTemplateId:
        input.recurringTemplateId === undefined ? debt.recurringTemplateId : cleanOptional(input.recurringTemplateId),
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      groupId: input.groupId === undefined ? debt.groupId : input.groupId,
      status:
        (input.status ?? debt.status) === 'settled'
          ? 'active'
          : input.status ?? debt.status,
      verificationStatus: nextVerificationStatus,
      verifiedByUserId: reviewFieldsChanged ? null : debt.verifiedByUserId,
      verifiedAt: reviewFieldsChanged ? null : debt.verifiedAt,
      rejectedByUserId: input.verificationStatus === 'rejected' ? debt.rejectedByUserId : debt.rejectedByUserId,
      rejectedAt: debt.rejectedAt,
      rejectionReason: debt.rejectionReason,
      disputeReason: debt.disputeReason,
      resolutionNote: debt.resolutionNote,
      suggestedChange: debt.suggestedChange,
      updatedAt: nowIso(),
    };
    await insertDebt(this.db, updated);
    if (updated.syncStatus === 'pending_update' && !requiresSharedApproval) {
      await this.queueSyncOperation({ entityType: 'debt', entityId: updated.id, operation: 'update', payload: updated });
    }
    if (reviewFieldsChanged && debt.verificationStatus === 'verified') {
      await this.logActivity('debt', debt.id, 'verification_reset_financial_edit', actorUserId, {
        previousStatus: debt.verificationStatus,
        nextStatus: updated.verificationStatus,
      });
    }

    const changes: {
      action: string;
      metadata: Record<string, unknown>;
    }[] = [];
    const addChange = (
      action: string,
      field: string,
      previousValue: unknown,
      nextValue: unknown,
      metadata: Record<string, unknown> = {},
    ) => {
      changes.push({
        action,
        metadata: { field, previousValue, nextValue, ...metadata },
      });
    };

    if (updated.title !== debt.title) {
      addChange('debt_title_changed', 'title', debt.title, updated.title);
    }
    if (updated.notes !== debt.notes) {
      addChange(
        updated.notes
          ? debt.notes
            ? 'debt_notes_updated'
            : 'debt_notes_added'
          : 'debt_notes_removed',
        'notes',
        debt.notes,
        updated.notes,
      );
    }
    if (updated.sharedNotes !== debt.sharedNotes) {
      addChange(
        updated.sharedNotes
          ? debt.sharedNotes
            ? 'debt_shared_notes_updated'
            : 'debt_shared_notes_added'
          : 'debt_shared_notes_removed',
        'sharedNotes',
        debt.sharedNotes,
        updated.sharedNotes,
      );
    }
    if (updated.dueDate !== debt.dueDate) {
      addChange(
        updated.dueDate
          ? debt.dueDate
            ? 'debt_due_date_changed'
            : 'debt_due_date_added'
          : 'debt_due_date_removed',
        'dueDate',
        debt.dueDate,
        updated.dueDate,
      );
    }
    if (updated.amount !== debt.amount) {
      addChange('debt_amount_changed', 'amount', debt.amount, updated.amount, {
        currency: debt.currency,
      });
    }
    if (updated.memberId !== debt.memberId) {
      addChange('debt_member_changed', 'memberId', debt.memberId, updated.memberId);
    }
    if (updated.direction !== debt.direction) {
      addChange('debt_direction_changed', 'direction', debt.direction, updated.direction);
    }
    if (updated.groupId !== debt.groupId) {
      addChange(
        updated.groupId ? 'debt_group_added' : 'debt_group_removed',
        'groupId',
        debt.groupId,
        updated.groupId,
      );
    }
    if (JSON.stringify(updated.tags) !== JSON.stringify(debt.tags)) {
      const addedTags = updated.tags.filter((tag) => !debt.tags.includes(tag));
      const removedTags = debt.tags.filter((tag) => !updated.tags.includes(tag));
      const action =
        addedTags.length > 0 && removedTags.length === 0
          ? 'debt_tag_added'
          : removedTags.length > 0 && addedTags.length === 0
            ? 'debt_tag_removed'
            : 'debt_tags_updated';
      addChange(action, 'tags', debt.tags, updated.tags, {
        addedTags,
        removedTags,
      });
    }
    if (updated.status !== debt.status && updated.status !== 'settled') {
      const action =
        updated.status === 'archived'
          ? 'debt_archived'
          : 'debt_reopened';
      addChange(action, 'status', debt.status, updated.status);
    }

    for (const change of changes) {
      await this.logActivity(
        'debt',
        debt.id,
        change.action,
        actorUserId,
        change.metadata,
      );
    }
    return updated;
  }

  async createGroup(input: GroupInput) {
    const timestamp = nowIso();
    const visibility = input.visibility ?? 'private';
    const group: Group = {
      id: createId('group'),
      localId: null,
      remoteId: input.remoteId ?? null,
      ownerUserId: cleanOptional(input.ownerUserId),
      name: input.name.trim(),
      notes: cleanOptional(input.notes),
      defaultCurrency: input.defaultCurrency,
      allowedCurrencies: input.allowedCurrencies?.length ? input.allowedCurrencies : [input.defaultCurrency],
      tags: cleanTags(input.tags),
      status: input.status ?? 'active',
      visibility,
      syncStatus: input.syncStatus ?? (visibility === 'shared' ? (input.remoteId ? 'synced' : 'pending_upload') : 'local_only'),
      archived: false,
      archivedAt: null,
      finalisedAt: null,
      lockedAt: null,
      ignoredDuplicateKeys: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertGroup(this.db, group);
    if (visibility === 'shared' && group.ownerUserId) {
      const participant: GroupParticipant = {
        id: createId('group_participant'),
        remoteId: null,
        groupId: group.id,
        remoteGroupId: group.remoteId,
        userId: group.ownerUserId,
        role: 'owner',
        status: 'active',
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: group.syncStatus,
      };
      await insertGroupParticipant(this.db, participant);
      await insertSharedGroupMember(this.db, {
        id: createId('group_member'),
        remoteId: input.ownerRemoteGroupMemberId ?? null,
        groupId: group.id,
        remoteGroupId: group.remoteId,
        type: 'linked_user',
        linkedUserId: group.ownerUserId,
        displayName: cleanOptional(input.ownerDisplayName) ?? 'You',
        alias: 'You',
        email: cleanOptional(input.ownerEmail),
        phone: null,
        notes: null,
        createdByUserId: group.ownerUserId,
        status: 'active',
        mergedIntoGroupMemberId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: group.syncStatus,
      });
      await this.logGroupActivity(group.id, 'group_created', group.ownerUserId, 'group', group.id, {
        name: group.name,
        visibility: group.visibility,
      });
    } else {
      await this.setGroupMembers(group.id, input.memberIds ?? []);
    }
    if (group.syncStatus === 'pending_upload' || group.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'group', entityId: group.id, operation: 'create', payload: group });
    }
    return group;
  }

  async updateGroup(
    group: Group,
    input: Partial<GroupInput> & {
      archived?: boolean;
      ignoredDuplicateKeys?: string[];
    },
  ) {
    const updated: Group = {
      ...group,
      name: input.name?.trim() ?? group.name,
      notes: input.notes === undefined ? group.notes : cleanOptional(input.notes),
      defaultCurrency: input.defaultCurrency ?? group.defaultCurrency,
      allowedCurrencies: input.allowedCurrencies ?? group.allowedCurrencies,
      tags: input.tags === undefined ? group.tags : cleanTags(input.tags),
      status: input.status ?? group.status,
      visibility: input.visibility ?? group.visibility,
      remoteId: input.remoteId === undefined ? group.remoteId : cleanOptional(input.remoteId),
      ownerUserId: input.ownerUserId === undefined ? group.ownerUserId : cleanOptional(input.ownerUserId),
      syncStatus:
        input.syncStatus ??
        (group.syncStatus === 'synced' && hasGroupUpdate(input) ? 'pending_update' : group.syncStatus),
      archived: input.archived ?? group.archived,
      archivedAt:
        input.archived === true && !group.archivedAt
          ? nowIso()
          : input.archived === false
            ? null
            : group.archivedAt,
      finalisedAt:
        input.status === 'finalising' && !group.finalisedAt
          ? nowIso()
          : input.status === 'active'
            ? null
            : group.finalisedAt,
      lockedAt:
        input.status === 'finalising' && !group.lockedAt
          ? nowIso()
          : input.status === 'active'
            ? null
            : group.lockedAt,
      ignoredDuplicateKeys: input.ignoredDuplicateKeys ?? group.ignoredDuplicateKeys,
      updatedAt: nowIso(),
    };
    await insertGroup(this.db, updated);
    if (group.visibility === 'private' && input.memberIds) {
      await this.setGroupMembers(group.id, input.memberIds);
    }
    if (group.visibility === 'shared') {
      await this.logGroupActivity(group.id, 'group_edited', input.ownerUserId ?? null, 'group', group.id, {
        status: updated.status,
        archived: updated.archived,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'group', entityId: updated.id, operation: 'update', payload: updated });
    }
    return updated;
  }

  async setGroupMembers(groupId: string, memberIds: string[]) {
    const current = await this.db.getAllAsync<{ member_id: string }>(
      `SELECT member_id FROM group_members WHERE group_id = ?`,
      [groupId],
    );
    const currentIds = new Set(current.map((row) => row.member_id));
    const nextIds = new Set(memberIds);
    const timestamp = nowIso();

    for (const memberId of currentIds) {
      if (!nextIds.has(memberId)) {
        await deleteGroupMember(this.db, groupId, memberId);
      }
    }

    for (const memberId of nextIds) {
      const groupMember: GroupMember = { groupId, memberId, createdAt: timestamp };
      await insertGroupMember(this.db, groupMember);
    }
  }

  async createSharedExpense(input: SharedExpenseInput) {
    const timestamp = nowIso();
    const expenseId = createId('expense');
    const expense = withGeneratedObligations({
      id: expenseId,
      remoteId: input.remoteId ?? null,
      groupId: input.groupId,
      creatorUserId: cleanOptional(input.creatorUserId),
      payerId: input.payerId,
      expensePayers: buildExpensePayers(
        expenseId,
        input.expensePayers ?? [{ groupMemberId: input.payerId, amountPaid: toAmount(input.amount) }],
        input.currency,
        timestamp,
      ),
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      expenseDate: input.expenseDate || todayIsoDate(),
      participantIds: cleanParticipants(input.participantIds),
      splitMethod: input.splitMethod ?? 'equal',
      splitAllocations: input.splitAllocations ?? {},
      dueDate: cleanOptional(input.dueDate),
      recurringTemplateId: cleanOptional(input.recurringTemplateId),
      tags: cleanTags(input.tags),
      status: input.status ?? 'active',
      verificationStatus: input.verificationStatus ?? 'local_only',
      visibility: input.visibility ?? 'private',
      syncStatus: input.syncStatus ?? (input.visibility === 'shared_group' ? (input.remoteId ? 'synced' : 'pending_upload') : 'local_only'),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await insertSharedExpense(this.db, expense);
    if (expense.visibility === 'shared_group') {
      await this.logGroupActivity(expense.groupId, 'expense_added', expense.creatorUserId, 'shared_expense', expense.id, {
        amount: expense.amount,
        currency: expense.currency,
        title: expense.title,
      });
    }
    if (expense.syncStatus === 'pending_upload' || expense.syncStatus === 'pending_create') {
      await this.queueSyncOperation({
        entityType: 'shared_expense',
        entityId: expense.id,
        operation: 'create',
        payload: expense,
        dependencyIds: [expense.groupId, expense.payerId, ...expense.participantIds, ...expense.expensePayers.map((payer) => payer.groupMemberId)].map(String),
      });
    }
    return expense;
  }

  async updateSharedExpense(expense: SharedExpense, input: Partial<SharedExpenseInput>) {
    const nextParticipantIds =
      input.participantIds === undefined ? expense.participantIds : cleanParticipants(input.participantIds);

    const financialFieldsChanged = [
      input.groupId !== undefined && input.groupId !== expense.groupId,
      input.payerId !== undefined && input.payerId !== expense.payerId,
      input.expensePayers !== undefined,
      input.amount !== undefined && toAmount(input.amount) !== expense.amount,
      input.currency !== undefined && input.currency !== expense.currency,
      input.participantIds !== undefined && nextParticipantIds.join('|') !== expense.participantIds.join('|'),
      input.splitMethod !== undefined && input.splitMethod !== expense.splitMethod,
      input.splitAllocations !== undefined,
    ].some(Boolean);

    const nextVerificationStatus =
      expense.verificationStatus === 'verified' && financialFieldsChanged
        ? 'pending'
        : input.verificationStatus ?? expense.verificationStatus;

    const updated = withGeneratedObligations({
      ...expense,
      remoteId: input.remoteId === undefined ? expense.remoteId : cleanOptional(input.remoteId),
      groupId: input.groupId ?? expense.groupId,
      creatorUserId: input.creatorUserId === undefined ? expense.creatorUserId : cleanOptional(input.creatorUserId),
      payerId: input.payerId ?? expense.payerId,
      expensePayers:
        input.expensePayers === undefined
          ? expense.expensePayers
          : buildExpensePayers(expense.id, input.expensePayers, input.currency ?? expense.currency, expense.createdAt),
      amount: input.amount === undefined ? expense.amount : toAmount(input.amount),
      currency: input.currency ?? expense.currency,
      title: input.title?.trim() ?? expense.title,
      notes: input.notes === undefined ? expense.notes : cleanOptional(input.notes),
      expenseDate: input.expenseDate ?? expense.expenseDate,
      participantIds: nextParticipantIds,
      splitMethod: input.splitMethod ?? expense.splitMethod,
      splitAllocations: input.splitAllocations ?? expense.splitAllocations,
      dueDate: input.dueDate === undefined ? expense.dueDate : cleanOptional(input.dueDate),
      recurringTemplateId:
        input.recurringTemplateId === undefined
          ? expense.recurringTemplateId
          : cleanOptional(input.recurringTemplateId),
      tags: input.tags === undefined ? expense.tags : cleanTags(input.tags),
      status: input.status ?? expense.status,
      verificationStatus: nextVerificationStatus,
      visibility: input.visibility ?? expense.visibility,
      syncStatus:
        input.syncStatus ??
        (financialFieldsChanged && expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus),
      updatedAt: nowIso(),
    });
    await insertSharedExpense(this.db, updated);
    if (updated.visibility === 'shared_group') {
      await this.logGroupActivity(updated.groupId, 'expense_edited', updated.creatorUserId, 'shared_expense', updated.id, {
        financialFieldsChanged,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({
        entityType: 'shared_expense',
        entityId: updated.id,
        operation: updated.status === 'archived' ? 'archive' : 'update',
        payload: updated,
        dependencyIds: [updated.groupId, updated.payerId, ...updated.participantIds, ...updated.expensePayers.map((payer) => payer.groupMemberId)].map(String),
      });
    }
    return updated;
  }

  async createGroupInvite(input: GroupInviteInput) {
    const timestamp = nowIso();
    const invite: GroupInvite = {
      id: createId('group_invite'),
      remoteId: input.remoteId ?? null,
      groupId: input.groupId,
      remoteGroupId: input.remoteGroupId ?? null,
      inviterUserId: input.inviterUserId,
      invitedUserId: cleanOptional(input.invitedUserId),
      invitedEmail: cleanOptional(input.invitedEmail),
      invitedPhone: cleanOptional(input.invitedPhone),
      invitedDisplayName: input.invitedDisplayName.trim(),
      offeredRole: input.offeredRole,
      status: 'pending',
      message: cleanOptional(input.message),
      createdAt: timestamp,
      updatedAt: timestamp,
      respondedAt: null,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertGroupInvite(this.db, invite);
    await this.logGroupActivity(invite.groupId, 'invite_sent', invite.inviterUserId, 'group_invite', invite.id, {
      invitedDisplayName: invite.invitedDisplayName,
      invitedEmail: invite.invitedEmail,
      offeredRole: invite.offeredRole,
    });
    if (invite.syncStatus === 'pending_upload' || invite.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'group_invite', entityId: invite.id, operation: 'create', payload: invite, dependencyIds: [invite.groupId] });
    }
    return invite;
  }

  async respondToGroupInvite(
    invite: GroupInvite,
    status: Extract<GroupInvite['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
    actorDisplayName?: string | null,
    actorEmail?: string | null,
  ) {
    const timestamp = nowIso();
    const updatedInvite: GroupInvite = {
      ...invite,
      status,
      invitedUserId: status === 'accepted' ? actorUserId : invite.invitedUserId,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: invite.remoteId ? 'pending_update' : invite.syncStatus,
    };
    await insertGroupInvite(this.db, updatedInvite);

    if (status === 'accepted') {
      const snapshot = await loadSnapshot(this.db);
      const group = snapshot.groups.find((item) => item.id === invite.groupId);
      const existingParticipant = snapshot.groupParticipants.find(
        (participant) => participant.groupId === invite.groupId && participant.userId === actorUserId,
      );
      await insertGroupParticipant(this.db, {
        id: existingParticipant?.id ?? createId('group_participant'),
        remoteId: existingParticipant?.remoteId ?? null,
        groupId: invite.groupId,
        remoteGroupId: invite.remoteGroupId,
        userId: actorUserId,
        role: invite.offeredRole,
        status: 'active',
        joinedAt: existingParticipant?.joinedAt ?? timestamp,
        createdAt: existingParticipant?.createdAt ?? timestamp,
        updatedAt: timestamp,
        syncStatus: invite.remoteId ? 'pending_update' : 'pending_upload',
      });

      const existingMember = snapshot.sharedGroupMembers.find(
        (member) => member.groupId === invite.groupId && member.linkedUserId === actorUserId && member.status !== 'merged',
      );
      if (!existingMember) {
        await insertSharedGroupMember(this.db, {
          id: createId('group_member'),
          remoteId: null,
          groupId: invite.groupId,
          remoteGroupId: group?.remoteId ?? invite.remoteGroupId,
          type: 'linked_user',
          linkedUserId: actorUserId,
          displayName: cleanOptional(actorDisplayName) ?? invite.invitedDisplayName,
          alias: null,
          email: cleanOptional(actorEmail) ?? invite.invitedEmail,
          phone: invite.invitedPhone,
          notes: null,
          createdByUserId: invite.inviterUserId,
          status: 'active',
          mergedIntoGroupMemberId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending_upload',
        });
      }
    }

    await this.logGroupActivity(
      invite.groupId,
      status === 'accepted' ? 'invite_accepted' : status === 'rejected' ? 'invite_rejected' : 'invite_cancelled',
      actorUserId,
      'group_invite',
      invite.id,
      { invitedDisplayName: invite.invitedDisplayName },
    );
    if (updatedInvite.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'group_invite', entityId: updatedInvite.id, operation: 'update', payload: updatedInvite, dependencyIds: [updatedInvite.groupId] });
    }
    return updatedInvite;
  }

  async createSharedGroupMember(input: SharedGroupMemberInput) {
    const snapshot = await loadSnapshot(this.db);
    if (input.linkedUserId) {
      const duplicateLinked = snapshot.sharedGroupMembers.find(
        (member) =>
          member.groupId === input.groupId &&
          member.linkedUserId === input.linkedUserId &&
          member.status !== 'merged' &&
          member.status !== 'archived',
      );
      if (duplicateLinked) {
        throw new Error('This linked user is already an group member.');
      }
    }

    const timestamp = nowIso();
    const member: SharedGroupMember = {
      id: createId('group_member'),
      remoteId: input.remoteId ?? null,
      groupId: input.groupId,
      remoteGroupId: input.remoteGroupId ?? null,
      type: input.type ?? (input.linkedUserId ? 'linked_user' : 'unlinked_placeholder'),
      linkedUserId: cleanOptional(input.linkedUserId),
      displayName: input.displayName.trim(),
      alias: cleanOptional(input.alias),
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      notes: cleanOptional(input.notes),
      createdByUserId: cleanOptional(input.createdByUserId),
      status: input.status ?? 'active',
      mergedIntoGroupMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertSharedGroupMember(this.db, member);
    await this.reconcileGroupDuplicateWarnings(member.groupId);
    await this.logGroupActivity(member.groupId, 'group_member_added', member.createdByUserId, 'group_member', member.id, {
      displayName: member.displayName,
      type: member.type,
    });
    if (member.syncStatus === 'pending_upload' || member.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'group_member', entityId: member.id, operation: 'create', payload: member, dependencyIds: [member.groupId] });
    }
    return member;
  }

  async updateSharedGroupMember(member: SharedGroupMember, input: Partial<SharedGroupMemberInput> & { archived?: boolean }) {
    const timestamp = nowIso();
    const updated: SharedGroupMember = {
      ...member,
      type: input.type ?? member.type,
      linkedUserId: input.linkedUserId === undefined ? member.linkedUserId : cleanOptional(input.linkedUserId),
      displayName: input.displayName?.trim() ?? member.displayName,
      alias: input.alias === undefined ? member.alias : cleanOptional(input.alias),
      email: input.email === undefined ? member.email : cleanOptional(input.email),
      phone: input.phone === undefined ? member.phone : cleanOptional(input.phone),
      notes: input.notes === undefined ? member.notes : cleanOptional(input.notes),
      status: input.archived ? 'archived' : input.status ?? member.status,
      syncStatus: input.syncStatus ?? (member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus),
      updatedAt: timestamp,
    };
    await insertSharedGroupMember(this.db, updated);
    await this.reconcileGroupDuplicateWarnings(updated.groupId);
    await this.logGroupActivity(updated.groupId, 'group_member_edited', input.createdByUserId ?? null, 'group_member', updated.id, {
      displayName: updated.displayName,
      status: updated.status,
    });
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'group_member', entityId: updated.id, operation: input.archived ? 'archive' : 'update', payload: updated, dependencyIds: [updated.groupId] });
    }
    return updated;
  }

  async createGroupMemberClaim(member: SharedGroupMember, claimantUserId: string, message?: string | null, remoteId?: string | null) {
    const timestamp = nowIso();
    const claim: GroupMemberClaim = {
      id: createId('group_claim'),
      remoteId: remoteId ?? null,
      groupId: member.groupId,
      remoteGroupId: member.remoteGroupId,
      groupMemberId: member.id,
      remoteGroupMemberId: member.remoteId,
      claimantUserId,
      status: 'pending',
      message: cleanOptional(message),
      respondedByUserId: null,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: remoteId ? 'synced' : 'pending_upload',
    };
    await insertGroupMemberClaim(this.db, claim);
    await insertSharedGroupMember(this.db, {
      ...member,
      status: 'claim_pending',
      updatedAt: timestamp,
      syncStatus: member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus,
    });
    await this.logGroupActivity(member.groupId, 'unlinked_member_claim_requested', claimantUserId, 'group_member_claim', claim.id, {
      groupMemberId: member.id,
      displayName: member.displayName,
    });
    if (claim.syncStatus === 'pending_upload' || claim.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'group_member_claim', entityId: claim.id, operation: 'create', payload: claim, dependencyIds: [member.id] });
    }
    return claim;
  }

  async respondToGroupMemberClaim(
    claim: GroupMemberClaim,
    member: SharedGroupMember,
    status: Extract<GroupMemberClaim['status'], 'approved' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) {
    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    if (status === 'approved') {
      const alreadyLinked = snapshot.sharedGroupMembers.find(
        (item) =>
          item.groupId === claim.groupId &&
          item.linkedUserId === claim.claimantUserId &&
          item.id !== member.id &&
          item.status !== 'merged',
      );
      if (alreadyLinked) {
        throw new Error('This user is already linked to another member in this group.');
      }
    }

    const updatedClaim: GroupMemberClaim = {
      ...claim,
      status,
      respondedByUserId: actorUserId,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: claim.remoteId ? 'pending_update' : claim.syncStatus,
    };
    await insertGroupMemberClaim(this.db, updatedClaim);

    if (status === 'approved') {
      await insertSharedGroupMember(this.db, {
        ...member,
        type: 'linked_user',
        linkedUserId: claim.claimantUserId,
        status: 'active',
        updatedAt: timestamp,
        syncStatus: member.remoteId ? 'pending_update' : member.syncStatus,
      });
    } else if (member.status === 'claim_pending') {
      await insertSharedGroupMember(this.db, {
        ...member,
        status: 'active',
        updatedAt: timestamp,
        syncStatus: member.remoteId ? 'pending_update' : member.syncStatus,
      });
    }

    await this.logGroupActivity(
      claim.groupId,
      status === 'approved' ? 'claim_approved' : status === 'rejected' ? 'claim_rejected' : 'claim_cancelled',
      actorUserId,
      'group_member_claim',
      claim.id,
      { groupMemberId: claim.groupMemberId, claimantUserId: claim.claimantUserId },
    );
    if (updatedClaim.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'group_member_claim', entityId: updatedClaim.id, operation: 'update', payload: updatedClaim, dependencyIds: [updatedClaim.groupMemberId] });
    }
    return updatedClaim;
  }

  async ignoreGroupDuplicateWarning(warning: GroupDuplicateWarning, actorUserId: string) {
    const timestamp = nowIso();
    const updated: GroupDuplicateWarning = {
      ...warning,
      status: 'ignored',
      ignoredByUserId: actorUserId,
      updatedAt: timestamp,
      syncStatus: warning.remoteId ? 'pending_update' : warning.syncStatus,
    };
    await insertGroupDuplicateWarning(this.db, updated);
    await this.logGroupActivity(warning.groupId, 'duplicate_warning_ignored', actorUserId, 'group_duplicate_warning', warning.id, {
      groupMemberIdA: warning.groupMemberIdA,
      groupMemberIdB: warning.groupMemberIdB,
    });
    return updated;
  }

  async mergeSharedGroupMembers(source: SharedGroupMember, target: SharedGroupMember, actorUserId: string) {
    if (source.type !== 'unlinked_placeholder' || target.type !== 'unlinked_placeholder') {
      throw new Error('Only unlinked group members can be merged.');
    }
    if (source.groupId !== target.groupId) {
      throw new Error('Members must belong to the same group.');
    }

    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    for (const expense of snapshot.sharedExpenses.filter((item) => item.groupId === source.groupId)) {
      const replacedParticipants = expense.participantIds.map((id) => (id === source.id ? target.id : id));
      const nextParticipantIds = Array.from(new Set(replacedParticipants));
      const updatedExpense = withGeneratedObligations({
        ...expense,
        payerId: expense.payerId === source.id ? target.id : expense.payerId,
        participantIds: nextParticipantIds,
        syncStatus: expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus,
        updatedAt: timestamp,
      });
      await insertSharedExpense(this.db, updatedExpense);
    }

    for (const debt of snapshot.groupDebts.filter((item) => item.groupId === source.groupId)) {
      await insertGroupDebt(this.db, {
        ...debt,
        debtorGroupMemberId: debt.debtorGroupMemberId === source.id ? target.id : debt.debtorGroupMemberId,
        creditorGroupMemberId: debt.creditorGroupMemberId === source.id ? target.id : debt.creditorGroupMemberId,
        syncStatus: debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus,
        updatedAt: timestamp,
      });
    }

    await insertSharedGroupMember(this.db, {
      ...source,
      status: 'merged',
      mergedIntoGroupMemberId: target.id,
      updatedAt: timestamp,
      syncStatus: source.remoteId ? 'pending_update' : source.syncStatus,
    });

    for (const warning of snapshot.groupDuplicateWarnings.filter(
      (item) =>
        item.groupId === source.groupId &&
        [item.groupMemberIdA, item.groupMemberIdB].includes(source.id) &&
        [item.groupMemberIdA, item.groupMemberIdB].includes(target.id),
    )) {
      await insertGroupDuplicateWarning(this.db, {
        ...warning,
        status: 'resolved',
        updatedAt: timestamp,
        syncStatus: warning.remoteId ? 'pending_update' : warning.syncStatus,
      });
    }

    await this.reconcileGroupDuplicateWarnings(source.groupId);
    await this.logGroupActivity(source.groupId, 'members_merged', actorUserId, 'group_member', target.id, {
      sourceGroupMemberId: source.id,
      targetGroupMemberId: target.id,
      sourceDisplayName: source.displayName,
      targetDisplayName: target.displayName,
    });
    return { sourceId: source.id, targetId: target.id };
  }

  async createGroupDebt(input: GroupDebtInput) {
    const timestamp = nowIso();
    const debt: GroupDebt = {
      id: createId('group_debt'),
      remoteId: input.remoteId ?? null,
      groupId: input.groupId,
      remoteGroupId: input.remoteGroupId ?? null,
      creatorUserId: cleanOptional(input.creatorUserId),
      debtorGroupMemberId: input.debtorGroupMemberId,
      creditorGroupMemberId: input.creditorGroupMemberId,
      amount: toAmount(input.amount),
      currency: input.currency,
      title: input.title.trim(),
      notes: cleanOptional(input.notes),
      debtDate: input.debtDate || todayIsoDate(),
      dueDate: cleanOptional(input.dueDate),
      tags: cleanTags(input.tags),
      verificationStatus: input.verificationStatus ?? 'pending',
      settlementStatus: input.settlementStatus ?? 'active',
      status: input.status ?? 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertGroupDebt(this.db, debt);
    await this.logGroupActivity(debt.groupId, 'simple_debt_added', debt.creatorUserId, 'group_debt', debt.id, {
      amount: debt.amount,
      currency: debt.currency,
      title: debt.title,
    });
    if (debt.syncStatus === 'pending_upload' || debt.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'group_debt', entityId: debt.id, operation: 'create', payload: debt, dependencyIds: [debt.groupId, debt.debtorGroupMemberId, debt.creditorGroupMemberId] });
    }
    return debt;
  }

  async updateGroupDebt(debt: GroupDebt, input: Partial<GroupDebtInput>) {
    const timestamp = nowIso();
    const updated: GroupDebt = {
      ...debt,
      remoteId: input.remoteId === undefined ? debt.remoteId : cleanOptional(input.remoteId),
      creatorUserId: input.creatorUserId === undefined ? debt.creatorUserId : cleanOptional(input.creatorUserId),
      debtorGroupMemberId: input.debtorGroupMemberId ?? debt.debtorGroupMemberId,
      creditorGroupMemberId: input.creditorGroupMemberId ?? debt.creditorGroupMemberId,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: input.currency ?? debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      debtDate: debt.debtDate,
      dueDate: input.dueDate === undefined ? debt.dueDate : cleanOptional(input.dueDate),
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      verificationStatus: input.verificationStatus ?? debt.verificationStatus,
      settlementStatus: input.settlementStatus ?? debt.settlementStatus,
      status: input.status ?? debt.status,
      archivedAt: input.status === 'archived' && !debt.archivedAt ? timestamp : debt.archivedAt,
      updatedAt: timestamp,
      syncStatus: input.syncStatus ?? (debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus),
    };
    await insertGroupDebt(this.db, updated);
    await this.logGroupActivity(updated.groupId, 'simple_debt_edited', updated.creatorUserId, 'group_debt', updated.id, {
      status: updated.status,
      verificationStatus: updated.verificationStatus,
    });
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'group_debt', entityId: updated.id, operation: updated.status === 'archived' ? 'archive' : 'update', payload: updated, dependencyIds: [updated.groupId, updated.debtorGroupMemberId, updated.creditorGroupMemberId] });
    }
    return updated;
  }

  async respondToGroupVerification(input: {
    groupId: string;
    targetType: GroupVerificationResponse['targetType'];
    targetId: string;
    groupMemberId: string;
    linkedUserId: string;
    status: Extract<VerificationStatus, 'verified' | 'rejected'>;
    rejectionReason?: string | null;
  }) {
    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    const existing = snapshot.groupVerificationResponses.find(
      (response) =>
        response.groupId === input.groupId &&
        response.targetType === input.targetType &&
        response.targetId === input.targetId &&
        response.groupMemberId === input.groupMemberId,
    );
    const response: GroupVerificationResponse = {
      id: existing?.id ?? createId('group_verify'),
      remoteId: existing?.remoteId ?? null,
      groupId: input.groupId,
      remoteGroupId: existing?.remoteGroupId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      remoteTargetId: existing?.remoteTargetId ?? null,
      groupMemberId: input.groupMemberId,
      linkedUserId: input.linkedUserId,
      responseStatus: input.status,
      rejectionReason: input.status === 'rejected' ? cleanOptional(input.rejectionReason) : null,
      respondedAt: timestamp,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      syncStatus: existing?.remoteId ? 'pending_update' : existing?.syncStatus ?? 'pending_upload',
    };
    await insertGroupVerificationResponse(this.db, response);
    await this.deriveGroupTargetVerification(input.groupId, input.targetType, input.targetId);
    await this.logGroupActivity(
      input.groupId,
      input.status === 'verified' ? 'expense_verified' : 'expense_rejected',
      input.linkedUserId,
      input.targetType === 'debt' ? 'group_debt' : 'shared_expense',
      input.targetId,
      { groupMemberId: input.groupMemberId, rejectionReason: response.rejectionReason },
    );
    if (response.syncStatus === 'pending_upload' || response.syncStatus === 'pending_create' || response.syncStatus === 'pending_update') {
      await this.queueSyncOperation({
        entityType: 'group_verification',
        entityId: response.id,
        operation: response.remoteId ? 'update' : 'create',
        payload: response,
        dependencyIds: [response.groupId, response.groupMemberId, response.targetId],
      });
    }
    return response;
  }

  async updateSettings(settings: Partial<AppSettings>) {
    for (const [key, value] of Object.entries(settings)) {
      await updateSetting(this.db, key as keyof AppSettings, String(value));
    }
  }

  async updateRate(currency: CurrencyCode, rateToSek: number) {
    await updateCurrencyRate(this.db, currency, rateToSek);
  }

  async createAttachment(input: AttachmentInput) {
    const timestamp = nowIso();
    const attachment: Attachment = {
      id: createId('attachment'),
      targetType: input.targetType,
      targetId: input.targetId,
      groupId: cleanOptional(input.groupId),
      createdByUserId: cleanOptional(input.createdByUserId),
      localUri: cleanOptional(input.localUri),
      remoteUrl: cleanOptional(input.remoteUrl),
      storagePath: cleanOptional(input.storagePath),
      fileName: input.fileName.trim(),
      fileType: input.fileType?.trim() || inferFileType(input.mimeType, input.fileName),
      mimeType: input.mimeType?.trim() || inferMimeType(input.fileName),
      fileSize: Math.max(0, Number(input.fileSize) || 0),
      attachmentKind: input.attachmentKind,
      visibility: input.visibility ?? 'private',
      thumbnailUri: cleanOptional(input.thumbnailUri) ?? cleanOptional(input.localUri),
      syncStatus: input.syncStatus ?? (input.visibility === 'shared' ? 'pending_upload' : 'local_only'),
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };
    await insertAttachment(this.db, attachment);
    await this.logActivity('attachment', attachment.id, 'attachment_added', attachment.createdByUserId, {
      targetType: attachment.targetType,
      targetId: attachment.targetId,
      attachmentKind: attachment.attachmentKind,
      visibility: attachment.visibility,
    });
    if (attachment.groupId && attachment.visibility === 'shared') {
      await this.logGroupActivity(attachment.groupId, 'attachment_added', attachment.createdByUserId, 'attachment', attachment.id, {
        targetType: attachment.targetType,
        targetId: attachment.targetId,
        attachmentKind: attachment.attachmentKind,
      });
    }
    if (attachment.syncStatus === 'pending_upload' || attachment.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'attachment', entityId: attachment.id, operation: 'create', payload: attachment, dependencyIds: [attachment.targetId] });
    }
    return attachment;
  }

  async upsertAttachment(attachment: Attachment) {
    await insertAttachment(this.db, attachment);
    return attachment;
  }

  async upsertComment(comment: Comment) {
    await insertComment(this.db, comment);
    return comment;
  }

  async archiveAttachment(attachment: Attachment, actorUserId?: string | null) {
    const updated: Attachment = {
      ...attachment,
      archivedAt: attachment.archivedAt ?? nowIso(),
      syncStatus: attachment.syncStatus === 'synced' ? 'pending_update' : attachment.syncStatus,
      updatedAt: nowIso(),
    };
    await insertAttachment(this.db, updated);
    await this.logActivity('attachment', attachment.id, 'attachment_removed', actorUserId ?? attachment.createdByUserId, {
      targetType: attachment.targetType,
      targetId: attachment.targetId,
    });
    if (attachment.groupId && attachment.visibility === 'shared') {
      await this.logGroupActivity(attachment.groupId, 'attachment_removed', actorUserId ?? attachment.createdByUserId, 'attachment', attachment.id, {
        targetType: attachment.targetType,
        targetId: attachment.targetId,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'attachment', entityId: updated.id, operation: 'archive', payload: updated, dependencyIds: [updated.targetId] });
    }
    return updated;
  }

  async createComment(input: CommentInput) {
    const timestamp = nowIso();
    const comment: Comment = {
      id: createId('comment'),
      targetType: input.targetType,
      targetId: input.targetId,
      groupId: cleanOptional(input.groupId),
      authorUserId: cleanOptional(input.authorUserId),
      localAuthorLabel: cleanOptional(input.localAuthorLabel),
      body: input.body.trim(),
      visibility: input.visibility ?? 'private',
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      syncStatus: input.syncStatus ?? (input.visibility === 'shared' ? 'pending_upload' : 'local_only'),
    };
    await insertComment(this.db, comment);
    await this.logActivity('comment', comment.id, 'comment_added', comment.authorUserId, {
      targetType: comment.targetType,
      targetId: comment.targetId,
      visibility: comment.visibility,
    });
    if (comment.groupId && comment.visibility === 'shared') {
      await this.logGroupActivity(comment.groupId, 'comment_added', comment.authorUserId, 'comment', comment.id, {
        targetType: comment.targetType,
        targetId: comment.targetId,
      });
    }
    if (comment.syncStatus === 'pending_upload' || comment.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'comment', entityId: comment.id, operation: 'create', payload: comment, dependencyIds: [comment.targetId] });
    }
    return comment;
  }

  async updateComment(comment: Comment, input: Partial<CommentInput>) {
    const updated: Comment = {
      ...comment,
      body: input.body?.trim() ?? comment.body,
      visibility: input.visibility ?? comment.visibility,
      syncStatus: comment.syncStatus === 'synced' ? 'pending_update' : comment.syncStatus,
      updatedAt: nowIso(),
    };
    await insertComment(this.db, updated);
    await this.logActivity('comment', comment.id, 'comment_edited', comment.authorUserId, {
      targetType: comment.targetType,
      targetId: comment.targetId,
    });
    if (comment.groupId && comment.visibility === 'shared') {
      await this.logGroupActivity(comment.groupId, 'comment_edited', comment.authorUserId, 'comment', comment.id, {
        targetType: comment.targetType,
        targetId: comment.targetId,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'comment', entityId: updated.id, operation: 'update', payload: updated, dependencyIds: [updated.targetId] });
    }
    return updated;
  }

  async deleteComment(comment: Comment, actorUserId?: string | null) {
    const updated: Comment = {
      ...comment,
      deletedAt: comment.deletedAt ?? nowIso(),
      syncStatus: comment.syncStatus === 'synced' ? 'pending_update' : comment.syncStatus,
      updatedAt: nowIso(),
    };
    await insertComment(this.db, updated);
    await this.logActivity('comment', comment.id, 'comment_deleted', actorUserId ?? comment.authorUserId, {
      targetType: comment.targetType,
      targetId: comment.targetId,
    });
    if (comment.groupId && comment.visibility === 'shared') {
      await this.logGroupActivity(comment.groupId, 'comment_deleted', actorUserId ?? comment.authorUserId, 'comment', comment.id, {
        targetType: comment.targetType,
        targetId: comment.targetId,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'comment', entityId: updated.id, operation: 'delete', payload: updated, dependencyIds: [updated.targetId] });
    }
    return updated;
  }

  async upsertSmartSuggestion(input: SmartSuggestion | SmartSuggestionInput) {
    const timestamp = nowIso();
    const suggestion: SmartSuggestion =
      'id' in input
        ? input
        : {
            id: createId('suggestion'),
            userId: cleanOptional(input.userId),
            suggestionType: input.suggestionType,
            targetType: input.targetType ?? null,
            targetId: cleanOptional(input.targetId),
            title: input.title.trim(),
            message: input.message.trim(),
            metadata: input.metadata ?? {},
            status: input.status ?? 'active',
            createdAt: timestamp,
            updatedAt: timestamp,
          };
    await insertSmartSuggestion(this.db, suggestion);
    return suggestion;
  }

  async setSmartSuggestionStatus(suggestion: SmartSuggestion, status: SmartSuggestionStatus) {
    const updated = { ...suggestion, status, updatedAt: nowIso() };
    await insertSmartSuggestion(this.db, updated);
    await this.logActivity('smart_suggestion', suggestion.id, `smart_suggestion_${status}`, suggestion.userId, {
      suggestionType: suggestion.suggestionType,
      targetType: suggestion.targetType,
      targetId: suggestion.targetId,
    });
    return updated;
  }

  async createExportLog(input: ExportLogInput) {
    const exportLog: ExportLog = {
      id: createId('export'),
      userId: cleanOptional(input.userId),
      exportType: input.exportType,
      targetType: input.targetType ?? null,
      targetId: cleanOptional(input.targetId),
      createdAt: nowIso(),
      metadata: input.metadata ?? {},
    };
    await insertExportLog(this.db, exportLog);
    await this.logActivity('export_log', exportLog.id, 'export_generated', exportLog.userId, {
      exportType: exportLog.exportType,
      targetType: exportLog.targetType,
      targetId: exportLog.targetId,
    });
    return exportLog;
  }

  async createCsvImportBatch(input: CsvImportBatchInput) {
    const timestamp = nowIso();
    const batch: CsvImportBatch = {
      id: createId('import'),
      userId: cleanOptional(input.userId),
      status: input.status ?? 'imported',
      sourceName: cleanOptional(input.sourceName),
      rowCount: Math.max(0, input.rowCount),
      importedMemberCount: Math.max(0, input.importedMemberCount ?? 0),
      importedDebtCount: Math.max(0, input.importedDebtCount ?? 0),
      errorCount: Math.max(0, input.errorCount ?? 0),
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: input.metadata ?? {},
    };
    await insertCsvImportBatch(this.db, batch);
    await this.logActivity('csv_import_batch', batch.id, 'import_completed', batch.userId, {
      rowCount: batch.rowCount,
      importedMemberCount: batch.importedMemberCount,
      importedDebtCount: batch.importedDebtCount,
      errorCount: batch.errorCount,
    });
    return batch;
  }

  async upsertProfile(profile: UserProfile) {
    const snapshot = await loadSnapshot(this.db);
    const previous = snapshot.profiles.find((item) => item.id === profile.id);
    const changedFields = previous
      ? [
          ['displayName', previous.displayName, profile.displayName],
          ['email', previous.email, profile.email],
          ['phone', previous.phone, profile.phone],
          ['country', previous.country, profile.country],
          ['avatar', previous.avatarUrl, profile.avatarUrl],
          ['baseCurrency', previous.baseCurrency, profile.baseCurrency],
        ]
          .filter(([, before, after]) => before !== after)
          .map(([field]) => field)
      : ['displayName', 'baseCurrency'];
    await insertProfile(this.db, profile);
    if (!previous || changedFields.length > 0) {
      await this.logActivity('profile', profile.id, 'profile_updated', profile.id, {
        displayName: profile.displayName,
        baseCurrency: profile.baseCurrency,
        changedFields,
      });
    }
    return profile;
  }

  async sendMemberLinkRequest(input: LinkMemberInput) {
    const timestamp = nowIso();
    const linkRequest: LinkRequest = {
      id: createId('link'),
      remoteId: input.remoteId ?? null,
      requesterUserId: input.requesterUserId,
      targetUserId: cleanOptional(input.targetUserId),
      targetEmail: cleanOptional(input.targetEmail),
      targetPhone: cleanOptional(input.targetPhone),
      requesterMemberId: input.member.id,
      requesterLabel: cleanOptional(input.requesterDisplayName) ?? input.member.displayName,
      status: 'pending',
      message: cleanOptional(input.message),
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.remoteId ? 'synced' : 'pending_upload',
    };
    await insertLinkRequest(this.db, linkRequest);
    await insertMember(this.db, {
      ...input.member,
      linkStatus: 'invite_pending',
      linkRequestId: linkRequest.id,
      // The request is remote, but the member remains a local-only record until
      // the target user accepts and the link is established.
      syncStatus: input.member.syncStatus,
      updatedAt: timestamp,
    });
    await this.logActivity('link_request', linkRequest.id, 'member_link_request_sent', input.requesterUserId, {
      memberId: input.member.id,
      targetEmail: linkRequest.targetEmail,
      targetPhone: linkRequest.targetPhone,
      status: linkRequest.status,
    });
    return linkRequest;
  }

  async upsertLinkRequest(linkRequest: LinkRequest) {
    await insertLinkRequest(this.db, linkRequest);
    return linkRequest;
  }

  async respondToLinkRequest(
    linkRequest: LinkRequest,
    status: Extract<LinkRequest['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) {
    const timestamp = nowIso();
    const updatedRequest: LinkRequest = {
      ...linkRequest,
      status,
      targetUserId: status === 'accepted' ? actorUserId : linkRequest.targetUserId,
      updatedAt: timestamp,
      syncStatus: linkRequest.remoteId ? 'pending_update' : linkRequest.syncStatus,
    };
    await insertLinkRequest(this.db, updatedRequest);

    const snapshot = await loadSnapshot(this.db);
    const localMember = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM members WHERE id = ?`,
      [linkRequest.requesterMemberId],
    );

    if (localMember) {
      const member = snapshot.members.find((item) => item.id === linkRequest.requesterMemberId);
      if (member) {
        await insertMember(this.db, {
          ...member,
          linkStatus: status === 'accepted' ? 'linked' : status === 'rejected' ? 'link_rejected' : 'unlinked',
          linkedUserId: status === 'accepted' ? actorUserId : member.linkedUserId,
          syncStatus: 'pending_update',
          updatedAt: timestamp,
        });
      }
    } else if (status === 'accepted' && linkRequest.requesterUserId !== actorUserId) {
      const reciprocalMember = snapshot.members.find(
        (member) => member.linkedUserId === linkRequest.requesterUserId,
      );
      if (!reciprocalMember) {
        await this.createMember({
          displayName: linkRequest.requesterLabel,
          linkedUserId: linkRequest.requesterUserId,
          linkStatus: 'linked',
          linkedProfileDisplayName: linkRequest.requesterLabel,
        });
      }
    }

    await this.logActivity('link_request', linkRequest.id, `member_link_${status}`, actorUserId, {
      memberId: linkRequest.requesterMemberId,
      status,
    });
    return updatedRequest;
  }

  async unlinkMember(member: Member, actorUserId: string | null) {
    const timestamp = nowIso();
    const updated: Member = {
      ...member,
      linkedUserId: null,
      linkStatus: 'link_removed',
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus,
      updatedAt: timestamp,
    };
    await insertMember(this.db, updated);
    await this.logActivity('member', member.id, 'member_unlinked', actorUserId, {});
    return updated;
  }

  async requestDebtVerification(input: DebtVerificationInput) {
    const timestamp = nowIso();
    const verification: DebtVerification = {
      id: createId('verify'),
      remoteId: input.remoteVerificationId ?? null,
      debtId: input.debt.id,
      remoteDebtId: input.remoteDebtId ?? input.debt.remoteId,
      requesterUserId: input.requesterUserId,
      responderUserId: input.responderUserId,
      requestType: input.requestType ?? 'creation',
      changeSummary: input.changeSummary ?? null,
      status: 'pending',
      rejectionReason: null,
      suggestedChange: null,
      supersedesVerificationId: null,
      requestedAt: timestamp,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.remoteVerificationId ? 'synced' : 'pending_upload',
    };
    const updatedDebt: Debt = {
      ...input.debt,
      remoteId: input.remoteDebtId ?? input.debt.remoteId,
      verificationRequestId: verification.id,
      visibility: 'shared_with_involved_member',
      syncStatus: input.remoteDebtId ? 'synced' : 'pending_upload',
      verificationStatus: 'pending',
      sharedNotes: cleanOptional(input.sharedNotes) ?? input.debt.sharedNotes ?? input.debt.notes,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      updatedAt: timestamp,
    };

    await insertDebt(this.db, updatedDebt);
    await insertDebtVerification(this.db, verification);
    const [refreshedDebt] = await this.refreshSimpleDebtConfirmationStatuses([
      input.debt.id,
    ]);
    await this.logActivity('debt', input.debt.id, 'debt_verification_requested', input.requesterUserId, {
      responderUserId: input.responderUserId,
      verificationId: verification.id,
      requestType: verification.requestType,
      changedFields: verification.changeSummary?.changedFields ?? [],
      verificationStatus: 'pending',
    });
    await this.createNotification({
      userId: input.requesterUserId,
      type: 'verification_request',
      title: verification.requestType === 'amendment' ? 'Debt change request sent' : 'Debt confirmation sent',
      body: `${updatedDebt.title} is waiting for confirmation.`,
      targetType: 'debt',
      targetId: updatedDebt.id,
      metadata: {
        verificationId: verification.id,
        verificationRemoteId: verification.remoteId,
        notificationKind: 'confirmation_request_sent',
        requestType: verification.requestType,
        actorUserId: input.requesterUserId,
        counterpartyUserId: input.responderUserId,
        counterpartyDisplayName: input.member.displayName,
        amount: updatedDebt.amount,
        currency: updatedDebt.currency,
        direction: updatedDebt.direction,
      },
    });
    return { debt: refreshedDebt ?? updatedDebt, verification };
  }

  async upsertDebtVerification(verification: DebtVerification) {
    await insertDebtVerification(this.db, verification);
    return verification;
  }

  async upsertDebt(debt: Debt) {
    await insertDebt(this.db, debt);
    return debt;
  }

  async upsertSharedExpense(expense: SharedExpense) {
    await insertSharedExpense(this.db, expense);
    return expense;
  }

  async upsertGroup(group: Group) {
    await insertGroup(this.db, group);
    return group;
  }

  async upsertGroupParticipant(participant: GroupParticipant) {
    await insertGroupParticipant(this.db, participant);
    return participant;
  }

  async upsertGroupInvite(invite: GroupInvite) {
    await insertGroupInvite(this.db, invite);
    return invite;
  }

  async upsertSharedGroupMember(member: SharedGroupMember) {
    await insertSharedGroupMember(this.db, member);
    return member;
  }

  async upsertGroupMemberClaim(claim: GroupMemberClaim) {
    await insertGroupMemberClaim(this.db, claim);
    return claim;
  }

  async upsertGroupDuplicateWarning(warning: GroupDuplicateWarning) {
    await insertGroupDuplicateWarning(this.db, warning);
    return warning;
  }

  async upsertGroupDebt(debt: GroupDebt) {
    await insertGroupDebt(this.db, debt);
    return debt;
  }

  async upsertGroupVerificationResponse(response: GroupVerificationResponse) {
    await insertGroupVerificationResponse(this.db, response);
    return response;
  }

  async upsertGroupActivityLog(activity: GroupActivityLog) {
    await insertGroupActivityLog(this.db, activity);
    return activity;
  }

  async upsertPayment(payment: Payment) {
    await insertPayment(this.db, payment);
    return payment;
  }

  async upsertSettlement(settlement: Settlement) {
    await insertSettlement(this.db, settlement);
    return settlement;
  }

  async upsertSettlementLine(line: SettlementLine) {
    await insertSettlementLine(this.db, line);
    return line;
  }

  async createPaymentSettlement(input: CreatePaymentInput) {
    const timestamp = nowIso();
    const groupScoped = Boolean(input.groupId);
    const confirmationStatus =
      input.confirmationStatus ??
      (groupScoped || input.visibility === 'shared_with_involved_member'
        ? 'pending_confirmation'
        : 'local_only');
    const payment: Payment = {
      id: createId('payment'),
      localId: null,
      remoteId: null,
      createdByUserId: cleanOptional(input.createdByUserId),
      payerUserId: cleanOptional(input.payerUserId),
      payeeUserId: cleanOptional(input.payeeUserId),
      payerMemberId: groupScoped || input.payerId === 'me' ? null : input.payerId,
      payeeMemberId: groupScoped || input.payeeId === 'me' ? null : input.payeeId,
      payerGroupMemberId: groupScoped ? input.payerId : null,
      payeeGroupMemberId: groupScoped ? input.payeeId : null,
      groupId: input.groupId ?? null,
      relatedMemberId: input.relatedMemberId ?? (!groupScoped && input.payerId !== 'me' ? input.payerId : input.payeeId !== 'me' ? input.payeeId : null),
      amount: toAmount(input.amount),
      currency: input.currency,
      paymentDate: input.paymentDate || todayIsoDate(),
      notes: cleanOptional(input.notes),
      status:
        input.status ??
        (confirmationStatus === 'pending_confirmation'
          ? 'pending_confirmation'
          : 'recorded'),
      confirmationStatus,
      visibility: input.visibility ?? (groupScoped ? 'shared_group' : 'private'),
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      syncStatus:
        groupScoped || input.visibility === 'shared_with_involved_member'
          ? 'pending_upload'
          : 'local_only',
    };
    const settlement: Settlement = {
      id: createId('settlement'),
      localId: null,
      remoteId: null,
      createdByUserId: payment.createdByUserId,
      groupId: input.groupId ?? null,
      memberId: payment.relatedMemberId,
      type: input.settlementType ?? 'manual',
      currency: payment.currency,
      totalAmount: payment.amount,
      status: payment.status === 'pending_confirmation' ? 'pending_confirmation' : 'recorded',
      confirmationStatus: payment.confirmationStatus,
      notes: cleanOptional(input.settlementNotes) ?? payment.notes,
      originalCurrency: input.convertedSettlement?.originalCurrency ?? null,
      originalAmount: input.convertedSettlement?.originalAmount ?? null,
      settlementCurrency: input.convertedSettlement?.settlementCurrency ?? null,
      settlementAmount: input.convertedSettlement?.settlementAmount ?? null,
      exchangeRateUsed: input.convertedSettlement?.exchangeRateUsed ?? null,
      exchangeRateDate: input.convertedSettlement?.exchangeRateDate ?? null,
      conversionNote: input.convertedSettlement?.conversionNote ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      syncStatus: payment.syncStatus,
    };
    const lines = (input.lines ?? []).map<SettlementLine>((line) => ({
      id: createId('settlement_line'),
      settlementId: settlement.id,
      paymentId: payment.id,
      sourceRecordType: line.sourceRecordType,
      sourceRecordId: line.sourceRecordId,
      appliedAmount: toAmount(line.appliedAmount),
      currency: payment.currency,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const appliedAmount = toAmount(lines.reduce((total, line) => total + line.appliedAmount, 0));
    const overpaymentAmount = toAmount(payment.amount - appliedAmount);

    await insertPayment(this.db, payment);
    await insertSettlement(this.db, settlement);
    for (const line of lines) {
      await insertSettlementLine(this.db, line);
    }
    await this.refreshSimpleDebtConfirmationStatuses(
      lines
        .filter((line) => line.sourceRecordType === 'simple_debt')
        .map((line) => line.sourceRecordId),
    );

    let overpaymentCredit: OverpaymentCredit | null = null;
    if (overpaymentAmount > 0.005) {
      overpaymentCredit = {
        id: createId('overpayment'),
        createdByUserId: payment.createdByUserId,
        payerMemberId: payment.payerMemberId,
        payeeMemberId: payment.payeeMemberId,
        payerGroupMemberId: payment.payerGroupMemberId,
        payeeGroupMemberId: payment.payeeGroupMemberId,
        groupId: payment.groupId,
        amount: overpaymentAmount,
        currency: payment.currency,
        sourcePaymentId: payment.id,
        status: 'open',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await insertOverpaymentCredit(this.db, overpaymentCredit);
    }

    await this.logActivity('payment', payment.id, 'payment_recorded', payment.createdByUserId, {
      settlementId: settlement.id,
      appliedAmount,
      overpaymentAmount,
    });
    await this.logActivity('settlement', settlement.id, 'settlement_record_created', payment.createdByUserId, {
      paymentId: payment.id,
      lineCount: lines.length,
    });
    if (payment.groupId) {
      await this.logGroupActivity(payment.groupId, 'settlement_record_created', payment.createdByUserId, 'settlement', settlement.id, {
        paymentId: payment.id,
        lineCount: lines.length,
        overpaymentAmount,
      });
    }
    if (payment.confirmationStatus === 'pending_confirmation') {
      await this.createNotification({
        userId: payment.createdByUserId,
        type: 'payment',
        title: 'Payment confirmation sent',
        body: `${payment.currency} ${payment.amount.toFixed(2)} is waiting for confirmation.`,
        targetType: 'payment',
        targetId: payment.id,
        metadata: {
          paymentId: payment.id,
          paymentRemoteId: payment.remoteId,
          notificationKind: 'payment_confirmation_request_sent',
          actorUserId: payment.createdByUserId,
          counterpartyUserId: payment.createdByUserId === payment.payerUserId
            ? payment.payeeUserId
            : payment.payerUserId,
          amount: payment.amount,
          currency: payment.currency,
        },
      });
    }
    if (payment.syncStatus === 'pending_upload' || payment.syncStatus === 'pending_create') {
      await this.queueSyncOperation({
        entityType: 'payment',
        entityId: payment.id,
        operation: 'create',
        payload: payment,
        dependencyIds: [
          payment.groupId,
          payment.payerGroupMemberId,
          payment.payeeGroupMemberId,
        ].filter(Boolean) as string[],
      });
      await this.queueSyncOperation({
        entityType: 'settlement',
        entityId: settlement.id,
        operation: 'create',
        payload: settlement,
        dependencyIds: [payment.id],
      });
    }
    return { payment, settlement, lines, overpaymentCredit };
  }

  async respondToPaymentConfirmation(
    payment: Payment,
    status: Extract<Payment['confirmationStatus'], 'confirmed' | 'rejected'>,
    actorUserId: string,
  ) {
    const updated: Payment = {
      ...payment,
      status: status === 'confirmed' ? 'confirmed' : 'rejected',
      confirmationStatus: status,
      updatedAt: nowIso(),
      syncStatus: payment.remoteId ? 'pending_update' : payment.syncStatus,
    };
    await insertPayment(this.db, updated);
    const snapshot = await loadSnapshot(this.db);
    await this.refreshSimpleDebtConfirmationStatuses(
      snapshot.settlementLines
        .filter(
          (line) =>
            line.paymentId === payment.id &&
            line.sourceRecordType === 'simple_debt',
        )
        .map((line) => line.sourceRecordId),
    );
    await this.logActivity('payment', payment.id, `payment_${status}`, actorUserId, {
      relatedMemberId: payment.relatedMemberId,
    });
    await this.createNotification({
      userId: actorUserId,
      type: 'payment',
      title: status === 'confirmed' ? 'Payment confirmed' : 'Payment rejected',
      body: `Your payment response was saved.`,
      targetType: 'payment',
      targetId: payment.id,
      metadata: {
        paymentId: payment.id,
        paymentRemoteId: payment.remoteId,
        notificationKind: 'payment_confirmation_response_sent',
        status,
        actorUserId,
        counterpartyUserId: payment.createdByUserId,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({
        entityType: 'payment',
        entityId: updated.id,
        operation: 'update',
        payload: updated,
      });
    }
    return updated;
  }

  private async refreshSimpleDebtConfirmationStatuses(debtIds: string[]) {
    const uniqueDebtIds = Array.from(new Set(debtIds));
    if (!uniqueDebtIds.length) {
      return [];
    }

    const snapshot = await loadSnapshot(this.db);
    const refreshed: Debt[] = [];
    for (const debtId of uniqueDebtIds) {
      const debt = snapshot.debts.find((item) => item.id === debtId);
      if (!debt || debt.visibility !== 'shared_with_involved_member') {
        continue;
      }
      const verificationStatus = deriveSimpleDebtConfirmationStatus(
        debt,
        snapshot.debtVerifications,
        snapshot.payments,
        snapshot.settlementLines,
      );
      const updated =
        verificationStatus === debt.verificationStatus
          ? debt
          : {
              ...debt,
              verificationStatus,
              updatedAt: nowIso(),
            };
      if (updated !== debt) {
        await insertDebt(this.db, updated);
      }
      refreshed.push(updated);
    }
    return refreshed;
  }

  async createRecurringTemplate(input: CreateRecurringTemplateInput) {
    const timestamp = nowIso();
    const template: RecurringTemplate = {
      id: createId('recurring'),
      createdByUserId: cleanOptional(input.createdByUserId),
      groupId: cleanOptional(input.groupId),
      memberId: cleanOptional(input.memberId),
      type: input.type,
      title: input.title.trim(),
      amount: toAmount(input.amount),
      currency: input.currency,
      recurrenceRule: input.recurrenceRule,
      startDate: input.startDate || todayIsoDate(),
      endDate: cleanOptional(input.endDate),
      nextOccurrenceDate: input.nextOccurrenceDate || input.startDate || todayIsoDate(),
      lastGeneratedDate: null,
      status: 'active',
      autoGenerate: input.autoGenerate ?? false,
      reminderSettings: input.reminderSettings ?? null,
      payload: input.payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertRecurringTemplate(this.db, template);
    await this.logActivity('recurring_template', template.id, 'recurring_template_created', template.createdByUserId, {
      type: template.type,
      recurrenceRule: template.recurrenceRule,
    });
    return template;
  }

  async updateRecurringTemplate(template: RecurringTemplate, input: Partial<CreateRecurringTemplateInput> & { status?: RecurringTemplate['status'] }) {
    const updated: RecurringTemplate = {
      ...template,
      title: input.title?.trim() ?? template.title,
      amount: input.amount === undefined ? template.amount : toAmount(input.amount),
      currency: input.currency ?? template.currency,
      recurrenceRule: input.recurrenceRule ?? template.recurrenceRule,
      endDate: input.endDate === undefined ? template.endDate : cleanOptional(input.endDate),
      nextOccurrenceDate: input.nextOccurrenceDate ?? template.nextOccurrenceDate,
      status: input.status ?? template.status,
      autoGenerate: input.autoGenerate ?? template.autoGenerate,
      reminderSettings: input.reminderSettings === undefined ? template.reminderSettings : input.reminderSettings,
      payload: input.payload ?? template.payload,
      updatedAt: nowIso(),
    };
    await insertRecurringTemplate(this.db, updated);
    await this.logActivity(
      'recurring_template',
      template.id,
      input.status === 'paused' ? 'recurring_template_paused' : input.status === 'ended' ? 'recurring_template_ended' : 'recurring_template_edited',
      updated.createdByUserId,
      { status: updated.status },
    );
    return updated;
  }

  async generateDueRecurringRecords() {
    const snapshot = await loadSnapshot(this.db);
    const today = todayIsoDate();
    const generated: string[] = [];
    for (const template of snapshot.recurringTemplates) {
      if (template.status !== 'active' || template.nextOccurrenceDate > today || (template.endDate && template.nextOccurrenceDate > template.endDate)) {
        continue;
      }
      const existingDebt = snapshot.debts.find(
        (debt) => debt.recurringTemplateId === template.id && debt.debtDate === template.nextOccurrenceDate,
      );
      const existingExpense = snapshot.sharedExpenses.find(
        (expense) => expense.recurringTemplateId === template.id && expense.expenseDate === template.nextOccurrenceDate,
      );
      if (existingDebt || existingExpense) {
        await insertRecurringTemplate(this.db, {
          ...template,
          lastGeneratedDate: template.nextOccurrenceDate,
          nextOccurrenceDate: nextOccurrenceDate(template.nextOccurrenceDate, template.recurrenceRule),
          updatedAt: nowIso(),
        });
        continue;
      }
      if (template.type === 'simple_debt') {
        await this.createDebt({
          memberId: String(template.payload.memberId ?? template.memberId ?? ''),
          direction: template.payload.direction === 'i_owe_them' ? 'i_owe_them' : 'they_owe_me',
          amount: template.amount,
          currency: template.currency,
          title: template.title,
          notes: typeof template.payload.notes === 'string' ? template.payload.notes : null,
          debtDate: template.nextOccurrenceDate,
          dueDate: typeof template.payload.dueDate === 'string' ? template.payload.dueDate : null,
          recurringTemplateId: template.id,
          tags: Array.isArray(template.payload.tags) ? (template.payload.tags as string[]) : ['Recurring'],
        });
      } else if (template.type === 'shared_expense') {
        await this.createSharedExpense({
          groupId: String(template.payload.groupId ?? template.groupId ?? ''),
          creatorUserId: template.createdByUserId,
          payerId: String(template.payload.payerId ?? 'me'),
          amount: template.amount,
          currency: template.currency,
          title: template.title,
          notes: typeof template.payload.notes === 'string' ? template.payload.notes : null,
          expenseDate: template.nextOccurrenceDate,
          participantIds: Array.isArray(template.payload.participantIds) ? (template.payload.participantIds as ParticipantId[]) : ['me'],
          splitMethod: (template.payload.splitMethod as SharedExpense['splitMethod'] | undefined) ?? 'equal',
          splitAllocations: (template.payload.splitAllocations as Record<ParticipantId, number> | undefined) ?? {},
          expensePayers: Array.isArray(template.payload.expensePayers)
            ? (template.payload.expensePayers as { groupMemberId: ParticipantId; amountPaid: number }[])
            : undefined,
          recurringTemplateId: template.id,
          tags: Array.isArray(template.payload.tags) ? (template.payload.tags as string[]) : ['Recurring'],
        });
      }
      generated.push(template.id);
      await insertRecurringTemplate(this.db, {
        ...template,
        lastGeneratedDate: template.nextOccurrenceDate,
        nextOccurrenceDate: nextOccurrenceDate(template.nextOccurrenceDate, template.recurrenceRule),
        updatedAt: nowIso(),
      });
      await this.logActivity('recurring_template', template.id, 'recurring_record_generated', template.createdByUserId, {
        generatedDate: template.nextOccurrenceDate,
      });
    }
    return generated;
  }

  async createReminder(input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Reminder['status'] }) {
    const timestamp = nowIso();
    const reminder: Reminder = {
      ...input,
      id: createId('reminder'),
      status: input.status ?? 'scheduled',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertReminder(this.db, reminder);
    await this.logActivity('reminder', reminder.id, 'reminder_scheduled', reminder.userId, {
      targetType: reminder.targetType,
      targetId: reminder.targetId,
    });
    return reminder;
  }

  async createSoftReminder(input: Omit<SoftReminder, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SoftReminder['status'] }) {
    const timestamp = nowIso();
    const reminder: SoftReminder = {
      ...input,
      id: createId('soft_reminder'),
      status: input.status ?? 'sent',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await insertSoftReminder(this.db, reminder);
    await this.logActivity('soft_reminder', reminder.id, 'reminder_sent', reminder.senderUserId, {
      relatedMemberId: reminder.relatedMemberId,
      relatedGroupId: reminder.relatedGroupId,
      relatedRecordId: reminder.relatedRecordId,
    });
    return reminder;
  }

  async respondToDebtVerification(
    verification: DebtVerification,
    debt: Debt,
    status: Extract<VerificationStatus, 'verified' | 'rejected'>,
    actorUserId: string,
    rejectionReason?: string | null,
    suggestedChange?: SuggestedDebtChange | null,
  ) {
    const timestamp = nowIso();
    const proposed =
      status === 'verified' && verification.requestType === 'amendment'
        ? verification.changeSummary?.proposed
        : undefined;
    const proposedDirection =
      proposed?.direction === 'they_owe_me'
        ? 'i_owe_them'
        : proposed?.direction === 'i_owe_them'
          ? 'they_owe_me'
          : debt.direction;
    const updatedVerification: DebtVerification = {
      ...verification,
      status,
      rejectionReason: status === 'rejected' ? cleanOptional(rejectionReason) : null,
      suggestedChange: status === 'rejected' ? suggestedChange ?? null : null,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: verification.remoteId ? 'pending_update' : verification.syncStatus,
    };
    const updatedDebt: Debt = {
      ...debt,
      amount: typeof proposed?.amount === 'number' ? toAmount(proposed.amount) : debt.amount,
      title: typeof proposed?.title === 'string' ? proposed.title.trim() : debt.title,
      dueDate:
        proposed && Object.hasOwn(proposed, 'dueDate')
          ? cleanOptional(proposed.dueDate as string | null)
          : debt.dueDate,
      direction: proposedDirection,
      status:
        proposed?.status === 'active' || proposed?.status === 'archived'
          ? proposed.status
          : debt.status,
      verificationStatus: status,
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      verifiedByUserId: status === 'verified' ? actorUserId : null,
      verifiedAt: status === 'verified' ? timestamp : null,
      rejectedByUserId: status === 'rejected' ? actorUserId : null,
      rejectedAt: status === 'rejected' ? timestamp : null,
      rejectionReason: status === 'rejected' ? cleanOptional(rejectionReason) : null,
      suggestedChange: status === 'rejected' ? suggestedChange ?? null : null,
      updatedAt: timestamp,
    };

    await insertDebtVerification(this.db, updatedVerification);
    await insertDebt(this.db, updatedDebt);
    const [refreshedDebt] = await this.refreshSimpleDebtConfirmationStatuses([
      debt.id,
    ]);
    await this.logActivity('debt', debt.id, status === 'verified' ? 'debt_verified' : 'debt_rejected', actorUserId, {
      verificationId: verification.id,
      rejectionReason: updatedVerification.rejectionReason,
      suggestedChange: updatedVerification.suggestedChange,
    });
    await this.createNotification({
      userId: actorUserId,
      type: 'verification_result',
      title: status === 'verified' ? 'Debt confirmed' : 'Debt rejected',
      body: `Your response for ${updatedDebt.title} was saved.`,
      targetType: 'debt',
      targetId: debt.id,
      metadata: {
        verificationId: verification.id,
        verificationRemoteId: verification.remoteId,
        notificationKind: 'debt_confirmation_response_sent',
        status,
        actorUserId,
        counterpartyUserId: verification.requesterUserId,
        amount: updatedDebt.amount,
        currency: updatedDebt.currency,
        direction: updatedDebt.direction,
      },
    });
    return { debt: refreshedDebt ?? updatedDebt, verification: updatedVerification };
  }

  async counterDebtVerification(
    incoming: DebtVerification,
    debt: Debt,
    actorUserId: string,
    changeSummary: DebtChangeSummary,
    remoteCounterproposal: {
      id: string;
      debt_id: string;
      requester_user_id: string;
      responder_user_id: string;
      requested_at: string;
      created_at: string;
      updated_at: string;
    } | null,
  ) {
    if (incoming.status !== 'pending' || incoming.responderUserId !== actorUserId) {
      throw new Error('Only the recipient can counter a pending proposal.');
    }
    const timestamp = remoteCounterproposal?.updated_at ?? nowIso();
    const updatedIncoming: DebtVerification = {
      ...incoming,
      status: 'countered',
      rejectionReason: null,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'synced',
    };
    const counterproposal: DebtVerification = {
      id: createId('verify'),
      remoteId: remoteCounterproposal?.id ?? null,
      debtId: debt.id,
      remoteDebtId: remoteCounterproposal?.debt_id ?? debt.remoteId,
      requesterUserId: actorUserId,
      responderUserId: incoming.requesterUserId,
      requestType: 'amendment',
      changeSummary,
      status: 'pending',
      rejectionReason: null,
      suggestedChange: null,
      supersedesVerificationId: incoming.id,
      requestedAt: remoteCounterproposal?.requested_at ?? timestamp,
      respondedAt: null,
      createdAt: remoteCounterproposal?.created_at ?? timestamp,
      updatedAt: timestamp,
      syncStatus: remoteCounterproposal ? 'synced' : 'pending_upload',
    };
    const updatedDebt: Debt = {
      ...debt,
      verificationRequestId: counterproposal.id,
      verificationStatus: 'pending',
      syncStatus: debt.remoteId ? 'synced' : debt.syncStatus,
      updatedAt: timestamp,
    };

    await insertDebtVerification(this.db, updatedIncoming);
    await insertDebtVerification(this.db, counterproposal);
    await insertDebt(this.db, updatedDebt);
    await this.logActivity('debt', debt.id, 'debt_counterproposal_sent', actorUserId, {
      verificationId: counterproposal.id,
      supersedesVerificationId: incoming.id,
      changedFields: changeSummary.changedFields,
      verificationStatus: 'pending',
    });
    await this.createNotification({
      userId: actorUserId,
      type: 'verification_result',
      title: 'Counterproposal sent',
      body: `${debt.title} is waiting for review.`,
      targetType: 'debt',
      targetId: debt.id,
      metadata: {
        verificationId: counterproposal.id,
        verificationRemoteId: counterproposal.remoteId,
        supersedesVerificationId: incoming.id,
        notificationKind: 'debt_counterproposal_sent',
        status: 'countered',
        actorUserId,
        counterpartyUserId: incoming.requesterUserId,
        amount: typeof changeSummary.proposed.amount === 'number'
          ? changeSummary.proposed.amount
          : debt.amount,
        currency: debt.currency,
        direction: changeSummary.proposed.direction ?? debt.direction,
      },
    });
    return { debt: updatedDebt, verification: counterproposal };
  }

  async markDebtDisputed(debt: Debt, actorUserId: string | null, disputeReason?: string | null) {
    const timestamp = nowIso();
    const updated: Debt = {
      ...debt,
      verificationStatus: 'disputed',
      disputeReason: cleanOptional(disputeReason),
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, updated);
    await this.logActivity('debt', debt.id, 'debt_marked_disputed', actorUserId, {
      disputeReason: updated.disputeReason,
    });
    return updated;
  }

  async markDebtResolved(debt: Debt, actorUserId: string | null, resolutionNote?: string | null) {
    const timestamp = nowIso();
    const updated: Debt = {
      ...debt,
      verificationStatus: 'resolved',
      resolutionNote: cleanOptional(resolutionNote),
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, updated);
    await this.logActivity('debt', debt.id, 'debt_resolved', actorUserId, {
      resolutionNote: updated.resolutionNote,
    });
    return updated;
  }

  async cancelDebtVerification(debt: Debt, verification: DebtVerification | undefined, actorUserId: string | null) {
    const timestamp = nowIso();
    const updatedDebt: Debt = {
      ...debt,
      verificationStatus: 'cancelled',
      syncStatus: debt.remoteId ? 'pending_update' : debt.syncStatus,
      updatedAt: timestamp,
    };
    await insertDebt(this.db, updatedDebt);
    if (verification) {
      await insertDebtVerification(this.db, {
        ...verification,
        status: 'cancelled',
        respondedAt: timestamp,
        updatedAt: timestamp,
        syncStatus: verification.remoteId ? 'pending_update' : verification.syncStatus,
      });
    }
    await this.logActivity('debt', debt.id, 'debt_verification_cancelled', actorUserId, {});
    return updatedDebt;
  }

  async logActivity(
    entityKind: ActivityTargetKind,
    entityId: string,
    action: string,
    actorUserId: string | null,
    metadata: Record<string, unknown>,
  ) {
    await insertActivityLog(this.db, {
      id: createId('activity'),
      entityKind,
      entityId,
      actorUserId,
      action,
      metadata,
      createdAt: nowIso(),
    });
  }

  async logGroupActivity(
    groupId: string,
    action: string,
    actorUserId: string | null,
    targetType: string,
    targetId: string | null,
    metadata: Record<string, unknown>,
  ) {
    const snapshot = await loadSnapshot(this.db);
    const group = snapshot.groups.find((item) => item.id === groupId);
    await insertGroupActivityLog(this.db, {
      id: createId('group_activity'),
      remoteId: null,
      groupId,
      remoteGroupId: group?.remoteId ?? null,
      actorUserId,
      action,
      targetType,
      targetId,
      metadata,
      createdAt: nowIso(),
      syncStatus: group?.syncStatus === 'synced' ? 'pending_upload' : group?.syncStatus ?? 'local_only',
    });
  }

  private async reconcileGroupDuplicateWarnings(groupId: string) {
    const snapshot = await loadSnapshot(this.db);
    const drafts = findSharedGroupDuplicateWarningDrafts(groupId, snapshot.sharedGroupMembers);
    const existingByPair = new Map(
      snapshot.groupDuplicateWarnings.map((warning) => [
        duplicatePairKey({
          groupId: warning.groupId,
          groupMemberIdA: warning.groupMemberIdA,
          groupMemberIdB: warning.groupMemberIdB,
          reason: warning.reason,
        }),
        warning,
      ]),
    );

    for (const draft of drafts) {
      const key = duplicatePairKey(draft);
      const existing = existingByPair.get(key);
      if (existing?.status === 'ignored' || existing?.status === 'resolved') {
        continue;
      }
      await insertGroupDuplicateWarning(this.db, buildDuplicateWarning(draft, existing));
    }
  }

  private async deriveGroupTargetVerification(
    groupId: string,
    targetType: GroupVerificationResponse['targetType'],
    targetId: string,
  ) {
    const snapshot = await loadSnapshot(this.db);
    const responses = snapshot.groupVerificationResponses.filter(
      (response) => response.groupId === groupId && response.targetType === targetType && response.targetId === targetId,
    );
    const responseStatuses = responses.map((response) => response.responseStatus);
    const nextStatus: VerificationStatus =
      responseStatuses.includes('rejected')
        ? 'rejected'
        : responseStatuses.includes('disputed')
          ? 'disputed'
          : responseStatuses.includes('verified')
            ? 'partially_verified'
            : 'pending';

    if (targetType === 'expense') {
      const expense = snapshot.sharedExpenses.find((item) => item.id === targetId);
      if (expense) {
        await insertSharedExpense(this.db, {
          ...expense,
          verificationStatus: nextStatus,
          updatedAt: nowIso(),
          syncStatus: expense.syncStatus === 'synced' ? 'pending_update' : expense.syncStatus,
        });
      }
    } else if (targetType === 'debt') {
      const debt = snapshot.groupDebts.find((item) => item.id === targetId);
      if (debt) {
        await insertGroupDebt(this.db, {
          ...debt,
          verificationStatus: nextStatus,
          updatedAt: nowIso(),
          syncStatus: debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus,
        });
      }
    }
  }
}

function deriveSimpleDebtConfirmationStatus(
  debt: Debt,
  verifications: DebtVerification[],
  payments: Payment[],
  settlementLines: SettlementLine[],
): Debt['verificationStatus'] {
  const latestByItem = new Map<string, DebtVerification['status']>();
  const relevantFields = new Set(['amount', 'direction', 'dueDate']);
  const orderedVerifications = verifications
    .filter(
      (verification) =>
        verification.debtId === debt.id &&
        verification.status !== 'cancelled',
    )
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  for (const verification of orderedVerifications) {
    const keys =
      verification.requestType === 'creation'
        ? ['creation']
        : (verification.changeSummary?.changedFields ?? []).filter((field) =>
            relevantFields.has(field),
          );
    for (const key of keys) {
      if (!latestByItem.has(key)) {
        latestByItem.set(key, verification.status);
      }
    }
  }

  const paymentIds = new Set(
    settlementLines
      .filter(
        (line) =>
          line.sourceRecordType === 'simple_debt' &&
          line.sourceRecordId === debt.id &&
          line.paymentId,
      )
      .map((line) => line.paymentId as string),
  );
  const statuses = [
    ...latestByItem.values(),
    ...payments
      .filter((payment) => paymentIds.has(payment.id))
      .map((payment) => payment.confirmationStatus),
  ];

  if (
    statuses.some(
      (status) => status === 'rejected' || status === 'disputed',
    )
  ) {
    return 'rejected';
  }
  if (
    statuses.some(
      (status) => status === 'pending' || status === 'pending_confirmation',
    )
  ) {
    return 'pending';
  }
  return statuses.length > 0 ? 'verified' : debt.verificationStatus;
}

function cleanOptional(value: string | null | undefined) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function cleanTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
}

function cleanParticipants(participantIds: ParticipantId[]) {
  return Array.from(new Set(participantIds));
}

function toAmount(value: number) {
  return Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
}

function inferMimeType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lower.endsWith('.csv')) {
    return 'text/csv';
  }
  return 'application/octet-stream';
}

function inferFileType(mimeType: string | null | undefined, fileName: string) {
  const mime = mimeType ?? inferMimeType(fileName);
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime.includes('pdf')) {
    return 'pdf';
  }
  if (mime.includes('csv') || mime.startsWith('text/')) {
    return 'text';
  }
  return 'file';
}

function withoutConflictBlockers(payload: Record<string, unknown>) {
  const { blocked: _blocked, conflictId: _conflictId, ...rest } = payload;
  return rest;
}

function buildExpensePayers(
  expenseId: string,
  payers: { groupMemberId: ParticipantId; amountPaid: number }[],
  currency: CurrencyCode,
  timestamp: string,
): ExpensePayer[] {
  return payers
    .filter((payer) => payer.groupMemberId && toAmount(payer.amountPaid) > 0)
    .map((payer, index) => ({
      id: `${expenseId}_payer_${payer.groupMemberId}_${index}`,
      expenseId,
      groupMemberId: payer.groupMemberId,
      amountPaid: toAmount(payer.amountPaid),
      currency,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
}

function nextOccurrenceDate(currentDate: string, recurrenceRule: string) {
  const date = new Date(`${currentDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return todayIsoDate();
  }
  const lower = recurrenceRule.toLowerCase();
  const intervalMatch = lower.match(/interval=(\d+)/);
  const interval = Math.max(1, Number(intervalMatch?.[1] ?? 1));
  if (lower.includes('weekly')) {
    date.setUTCDate(date.getUTCDate() + 7 * interval);
  } else if (lower.includes('yearly')) {
    date.setUTCFullYear(date.getUTCFullYear() + interval);
  } else {
    date.setUTCMonth(date.getUTCMonth() + interval);
  }
  return date.toISOString().slice(0, 10);
}

function hasGroupUpdate(input: Partial<GroupInput> & { archived?: boolean; ignoredDuplicateKeys?: string[] }) {
  return [
    input.name,
    input.notes,
    input.defaultCurrency,
    input.allowedCurrencies,
    input.tags,
    input.status,
    input.visibility,
    input.archived,
    input.ignoredDuplicateKeys,
  ].some((value) => value !== undefined);
}
