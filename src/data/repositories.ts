import type * as SQLite from 'expo-sqlite';

import {
  deleteEventMember,
  insertAttachment,
  insertActivityLog,
  insertAuditLog,
  insertComment,
  insertCsvImportBatch,
  insertDebt,
  insertDebtVerification,
  insertEvent,
  insertEventActivityLog,
  insertExportLog,
  insertEventDebt,
  insertEventDuplicateWarning,
  insertEventMember,
  insertEventMemberClaim,
  insertEventParticipant,
  insertEventInvite,
  insertEventVerificationResponse,
  insertLinkRequest,
  insertMember,
  insertOverpaymentCredit,
  insertPayment,
  insertProfile,
  insertRecurringTemplate,
  insertReminder,
  insertSettlement,
  insertSettlementLine,
  insertSharedEventMember,
  insertSharedExpense,
  insertSoftReminder,
  insertSmartSuggestion,
  insertSyncConflict,
  insertSyncQueueEntry,
  insertNotification,
  loadSnapshot,
  resetDatabase,
  updateCurrencyRate,
  updateSetting,
} from '@/src/data/database';
import {
  canApplyRemoteSnapshot,
  getConflictResolutionAvailability,
  getRelatedSyncQueueEntries,
} from './conflictResolution';
import { buildRestorePlan, type RestoreResult } from '@/src/services/backupRestore';
import { withGeneratedObligations } from '@/src/services/splits';
import {
  buildDuplicateWarning,
  duplicatePairKey,
  findSharedEventDuplicateWarningDrafts,
} from '@/src/services/eventDuplicates';
import type {
  AppSettings,
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
  DebtVerification,
  DebtStatus,
  Event,
  EventActivityLog,
  EventDebt,
  EventDuplicateWarning,
  EventInvite,
  EventMember,
  EventMemberClaim,
  EventParticipant,
  EventRole,
  EventStatus,
  EventVerificationResponse,
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
  SharedEventMember,
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
  eventId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: Debt['visibility'];
};

type EventInput = {
  name: string;
  notes?: string | null;
  defaultCurrency: CurrencyCode;
  allowedCurrencies?: CurrencyCode[];
  tags?: string[];
  status?: EventStatus;
  visibility?: Event['visibility'];
  ownerUserId?: string | null;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
  remoteId?: string | null;
  ownerRemoteEventMemberId?: string | null;
  syncStatus?: SyncStatus;
  memberIds?: string[];
};

type SharedExpenseInput = {
  eventId: string;
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
  expensePayers?: { eventMemberId: ParticipantId; amountPaid: number }[];
  dueDate?: string | null;
  recurringTemplateId?: string | null;
  tags?: string[];
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: SharedExpense['visibility'];
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type EventInviteInput = {
  eventId: string;
  remoteEventId?: string | null;
  inviterUserId: string;
  invitedUserId?: string | null;
  invitedEmail?: string | null;
  invitedPhone?: string | null;
  invitedDisplayName: string;
  offeredRole: Exclude<EventRole, 'owner'>;
  message?: string | null;
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type SharedEventMemberInput = {
  eventId: string;
  remoteEventId?: string | null;
  type?: SharedEventMember['type'];
  linkedUserId?: string | null;
  displayName: string;
  alias?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  status?: SharedEventMember['status'];
  remoteId?: string | null;
  syncStatus?: SyncStatus;
};

type EventDebtInput = {
  eventId: string;
  remoteEventId?: string | null;
  creatorUserId?: string | null;
  debtorEventMemberId: string;
  creditorEventMemberId: string;
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
  eventId?: string | null;
  relatedMemberId?: string | null;
  visibility?: Payment['visibility'];
  status?: Payment['status'];
  confirmationStatus?: Payment['confirmationStatus'];
  createdByUserId?: string | null;
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
  eventId?: string | null;
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
};

type AttachmentInput = {
  targetType: AttachmentTargetType;
  targetId: string;
  eventId?: string | null;
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
  eventId?: string | null;
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

  async reset(seed = true) {
    await resetDatabase(this.db, seed);
  }

  async restoreBackup(rawJson: string, mode: BackupMode): Promise<RestoreResult> {
    const current = await loadSnapshot(this.db);
    const plan = buildRestorePlan(rawJson, current, mode);

    if (mode === 'replace_local') {
      await resetDatabase(this.db, false);
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
    for (const event of plan.records.events) {
      await insertEvent(this.db, event);
    }
    for (const eventMember of plan.records.eventMembers) {
      await insertEventMember(this.db, eventMember);
    }
    for (const member of plan.records.sharedEventMembers) {
      await insertSharedEventMember(this.db, member);
    }
    for (const debt of plan.records.debts) {
      await insertDebt(this.db, debt);
    }
    for (const expense of plan.records.sharedExpenses) {
      await insertSharedExpense(this.db, expense);
    }
    for (const debt of plan.records.eventDebts) {
      await insertEventDebt(this.db, debt);
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
      eventId: null,
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
      eventId: null,
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
      case 'event':
        await insertEvent(this.db, remoteSnapshot as Event);
        return;
      case 'shared_expense':
        await insertSharedExpense(this.db, remoteSnapshot as SharedExpense);
        return;
      case 'event_invite':
        await insertEventInvite(this.db, remoteSnapshot as EventInvite);
        return;
      case 'event_member':
        await insertSharedEventMember(this.db, remoteSnapshot as SharedEventMember);
        return;
      case 'event_member_claim':
        await insertEventMemberClaim(this.db, remoteSnapshot as EventMemberClaim);
        return;
      case 'event_duplicate_warning':
        await insertEventDuplicateWarning(this.db, remoteSnapshot as EventDuplicateWarning);
        return;
      case 'event_debt':
        await insertEventDebt(this.db, remoteSnapshot as EventDebt);
        return;
      case 'event_verification':
        await insertEventVerificationResponse(this.db, remoteSnapshot as EventVerificationResponse);
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
      eventId: input.eventId ?? null,
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

  async updateDebt(debt: Debt, input: Partial<DebtInput>) {
    const financialFieldsChanged = [
      input.memberId !== undefined && input.memberId !== debt.memberId,
      input.direction !== undefined && input.direction !== debt.direction,
      input.amount !== undefined && toAmount(input.amount) !== debt.amount,
      input.currency !== undefined && input.currency !== debt.currency,
      input.eventId !== undefined && input.eventId !== debt.eventId,
      input.debtDate !== undefined && input.debtDate !== debt.debtDate,
    ].some(Boolean);

    const nextVerificationStatus =
      ['pending', 'verified', 'rejected', 'disputed', 'resolved'].includes(debt.verificationStatus) && financialFieldsChanged
        ? debt.visibility === 'shared_with_involved_member'
          ? 'pending'
          : 'local_only'
        : input.verificationStatus ?? debt.verificationStatus;

    const updated: Debt = {
      ...debt,
      memberId: input.memberId ?? debt.memberId,
      visibility: input.visibility ?? debt.visibility,
      syncStatus:
        financialFieldsChanged && debt.syncStatus === 'synced'
          ? 'pending_update'
          : input.visibility === 'shared_with_involved_member' && debt.syncStatus === 'local_only'
            ? 'pending_upload'
            : debt.syncStatus,
      direction: input.direction ?? debt.direction,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: input.currency ?? debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      sharedNotes: input.sharedNotes === undefined ? debt.sharedNotes : cleanOptional(input.sharedNotes),
      debtDate: input.debtDate ?? debt.debtDate,
      dueDate: input.dueDate === undefined ? debt.dueDate : cleanOptional(input.dueDate),
      recurringTemplateId:
        input.recurringTemplateId === undefined ? debt.recurringTemplateId : cleanOptional(input.recurringTemplateId),
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      eventId: input.eventId === undefined ? debt.eventId : input.eventId,
      status: input.status ?? debt.status,
      verificationStatus: nextVerificationStatus,
      verifiedByUserId: financialFieldsChanged ? null : debt.verifiedByUserId,
      verifiedAt: financialFieldsChanged ? null : debt.verifiedAt,
      rejectedByUserId: input.verificationStatus === 'rejected' ? debt.rejectedByUserId : debt.rejectedByUserId,
      rejectedAt: debt.rejectedAt,
      rejectionReason: debt.rejectionReason,
      disputeReason: debt.disputeReason,
      resolutionNote: debt.resolutionNote,
      suggestedChange: debt.suggestedChange,
      updatedAt: nowIso(),
    };
    await insertDebt(this.db, updated);
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'debt', entityId: updated.id, operation: 'update', payload: updated });
    }
    if (financialFieldsChanged && debt.verificationStatus === 'verified') {
      await this.logActivity('debt', debt.id, 'verification_reset_financial_edit', null, {
        previousStatus: debt.verificationStatus,
        nextStatus: updated.verificationStatus,
      });
    } else if (input.status === 'archived' && debt.status !== 'archived') {
      await this.logActivity('debt', debt.id, 'debt_archived', null, {});
    } else if (input.status === 'settled' && debt.status !== 'settled') {
      await this.logActivity('debt', debt.id, 'debt_settled', null, {});
    } else {
      await this.logActivity('debt', debt.id, 'debt_edited', null, {
        financialFieldsChanged,
      });
    }
    return updated;
  }

  async createEvent(input: EventInput) {
    const timestamp = nowIso();
    const visibility = input.visibility ?? 'private';
    const event: Event = {
      id: createId('event'),
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
    await insertEvent(this.db, event);
    if (visibility === 'shared' && event.ownerUserId) {
      const participant: EventParticipant = {
        id: createId('event_participant'),
        remoteId: null,
        eventId: event.id,
        remoteEventId: event.remoteId,
        userId: event.ownerUserId,
        role: 'owner',
        status: 'active',
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: event.syncStatus,
      };
      await insertEventParticipant(this.db, participant);
      await insertSharedEventMember(this.db, {
        id: createId('event_member'),
        remoteId: input.ownerRemoteEventMemberId ?? null,
        eventId: event.id,
        remoteEventId: event.remoteId,
        type: 'linked_user',
        linkedUserId: event.ownerUserId,
        displayName: cleanOptional(input.ownerDisplayName) ?? 'You',
        alias: 'You',
        email: cleanOptional(input.ownerEmail),
        phone: null,
        notes: null,
        createdByUserId: event.ownerUserId,
        status: 'active',
        mergedIntoEventMemberId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: event.syncStatus,
      });
      await this.logEventActivity(event.id, 'event_created', event.ownerUserId, 'event', event.id, {
        name: event.name,
        visibility: event.visibility,
      });
    } else {
      await this.setEventMembers(event.id, input.memberIds ?? []);
    }
    if (event.syncStatus === 'pending_upload' || event.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'event', entityId: event.id, operation: 'create', payload: event });
    }
    return event;
  }

  async updateEvent(
    event: Event,
    input: Partial<EventInput> & {
      archived?: boolean;
      ignoredDuplicateKeys?: string[];
    },
  ) {
    const updated: Event = {
      ...event,
      name: input.name?.trim() ?? event.name,
      notes: input.notes === undefined ? event.notes : cleanOptional(input.notes),
      defaultCurrency: input.defaultCurrency ?? event.defaultCurrency,
      allowedCurrencies: input.allowedCurrencies ?? event.allowedCurrencies,
      tags: input.tags === undefined ? event.tags : cleanTags(input.tags),
      status: input.status ?? event.status,
      visibility: input.visibility ?? event.visibility,
      remoteId: input.remoteId === undefined ? event.remoteId : cleanOptional(input.remoteId),
      ownerUserId: input.ownerUserId === undefined ? event.ownerUserId : cleanOptional(input.ownerUserId),
      syncStatus:
        input.syncStatus ??
        (event.syncStatus === 'synced' && hasEventUpdate(input) ? 'pending_update' : event.syncStatus),
      archived: input.archived ?? event.archived,
      archivedAt:
        input.archived === true && !event.archivedAt
          ? nowIso()
          : input.archived === false
            ? null
            : event.archivedAt,
      finalisedAt:
        input.status === 'finalising' && !event.finalisedAt
          ? nowIso()
          : input.status === 'active'
            ? null
            : event.finalisedAt,
      lockedAt:
        input.status === 'finalising' && !event.lockedAt
          ? nowIso()
          : input.status === 'active'
            ? null
            : event.lockedAt,
      ignoredDuplicateKeys: input.ignoredDuplicateKeys ?? event.ignoredDuplicateKeys,
      updatedAt: nowIso(),
    };
    await insertEvent(this.db, updated);
    if (event.visibility === 'private' && input.memberIds) {
      await this.setEventMembers(event.id, input.memberIds);
    }
    if (event.visibility === 'shared') {
      await this.logEventActivity(event.id, 'event_edited', input.ownerUserId ?? null, 'event', event.id, {
        status: updated.status,
        archived: updated.archived,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'event', entityId: updated.id, operation: 'update', payload: updated });
    }
    return updated;
  }

  async setEventMembers(eventId: string, memberIds: string[]) {
    const current = await this.db.getAllAsync<{ member_id: string }>(
      `SELECT member_id FROM event_members WHERE event_id = ?`,
      [eventId],
    );
    const currentIds = new Set(current.map((row) => row.member_id));
    const nextIds = new Set(memberIds);
    const timestamp = nowIso();

    for (const memberId of currentIds) {
      if (!nextIds.has(memberId)) {
        await deleteEventMember(this.db, eventId, memberId);
      }
    }

    for (const memberId of nextIds) {
      const eventMember: EventMember = { eventId, memberId, createdAt: timestamp };
      await insertEventMember(this.db, eventMember);
    }
  }

  async createSharedExpense(input: SharedExpenseInput) {
    const timestamp = nowIso();
    const expenseId = createId('expense');
    const expense = withGeneratedObligations({
      id: expenseId,
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      creatorUserId: cleanOptional(input.creatorUserId),
      payerId: input.payerId,
      expensePayers: buildExpensePayers(
        expenseId,
        input.expensePayers ?? [{ eventMemberId: input.payerId, amountPaid: toAmount(input.amount) }],
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
      syncStatus: input.syncStatus ?? (input.visibility === 'shared_event' ? (input.remoteId ? 'synced' : 'pending_upload') : 'local_only'),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await insertSharedExpense(this.db, expense);
    if (expense.visibility === 'shared_event') {
      await this.logEventActivity(expense.eventId, 'expense_added', expense.creatorUserId, 'shared_expense', expense.id, {
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
        dependencyIds: [expense.eventId, expense.payerId, ...expense.participantIds, ...expense.expensePayers.map((payer) => payer.eventMemberId)].map(String),
      });
    }
    return expense;
  }

  async updateSharedExpense(expense: SharedExpense, input: Partial<SharedExpenseInput>) {
    const nextParticipantIds =
      input.participantIds === undefined ? expense.participantIds : cleanParticipants(input.participantIds);

    const financialFieldsChanged = [
      input.eventId !== undefined && input.eventId !== expense.eventId,
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
      eventId: input.eventId ?? expense.eventId,
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
    if (updated.visibility === 'shared_event') {
      await this.logEventActivity(updated.eventId, 'expense_edited', updated.creatorUserId, 'shared_expense', updated.id, {
        financialFieldsChanged,
      });
    }
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({
        entityType: 'shared_expense',
        entityId: updated.id,
        operation: updated.status === 'archived' ? 'archive' : 'update',
        payload: updated,
        dependencyIds: [updated.eventId, updated.payerId, ...updated.participantIds, ...updated.expensePayers.map((payer) => payer.eventMemberId)].map(String),
      });
    }
    return updated;
  }

  async createEventInvite(input: EventInviteInput) {
    const timestamp = nowIso();
    const invite: EventInvite = {
      id: createId('event_invite'),
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: input.remoteEventId ?? null,
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
    await insertEventInvite(this.db, invite);
    await this.logEventActivity(invite.eventId, 'invite_sent', invite.inviterUserId, 'event_invite', invite.id, {
      invitedDisplayName: invite.invitedDisplayName,
      invitedEmail: invite.invitedEmail,
      offeredRole: invite.offeredRole,
    });
    if (invite.syncStatus === 'pending_upload' || invite.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'event_invite', entityId: invite.id, operation: 'create', payload: invite, dependencyIds: [invite.eventId] });
    }
    return invite;
  }

  async respondToEventInvite(
    invite: EventInvite,
    status: Extract<EventInvite['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
    actorDisplayName?: string | null,
    actorEmail?: string | null,
  ) {
    const timestamp = nowIso();
    const updatedInvite: EventInvite = {
      ...invite,
      status,
      invitedUserId: status === 'accepted' ? actorUserId : invite.invitedUserId,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: invite.remoteId ? 'pending_update' : invite.syncStatus,
    };
    await insertEventInvite(this.db, updatedInvite);

    if (status === 'accepted') {
      const snapshot = await loadSnapshot(this.db);
      const event = snapshot.events.find((item) => item.id === invite.eventId);
      const existingParticipant = snapshot.eventParticipants.find(
        (participant) => participant.eventId === invite.eventId && participant.userId === actorUserId,
      );
      await insertEventParticipant(this.db, {
        id: existingParticipant?.id ?? createId('event_participant'),
        remoteId: existingParticipant?.remoteId ?? null,
        eventId: invite.eventId,
        remoteEventId: invite.remoteEventId,
        userId: actorUserId,
        role: invite.offeredRole,
        status: 'active',
        joinedAt: existingParticipant?.joinedAt ?? timestamp,
        createdAt: existingParticipant?.createdAt ?? timestamp,
        updatedAt: timestamp,
        syncStatus: invite.remoteId ? 'pending_update' : 'pending_upload',
      });

      const existingMember = snapshot.sharedEventMembers.find(
        (member) => member.eventId === invite.eventId && member.linkedUserId === actorUserId && member.status !== 'merged',
      );
      if (!existingMember) {
        await insertSharedEventMember(this.db, {
          id: createId('event_member'),
          remoteId: null,
          eventId: invite.eventId,
          remoteEventId: event?.remoteId ?? invite.remoteEventId,
          type: 'linked_user',
          linkedUserId: actorUserId,
          displayName: cleanOptional(actorDisplayName) ?? invite.invitedDisplayName,
          alias: null,
          email: cleanOptional(actorEmail) ?? invite.invitedEmail,
          phone: invite.invitedPhone,
          notes: null,
          createdByUserId: invite.inviterUserId,
          status: 'active',
          mergedIntoEventMemberId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncStatus: 'pending_upload',
        });
      }
    }

    await this.logEventActivity(
      invite.eventId,
      status === 'accepted' ? 'invite_accepted' : status === 'rejected' ? 'invite_rejected' : 'invite_cancelled',
      actorUserId,
      'event_invite',
      invite.id,
      { invitedDisplayName: invite.invitedDisplayName },
    );
    if (updatedInvite.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'event_invite', entityId: updatedInvite.id, operation: 'update', payload: updatedInvite, dependencyIds: [updatedInvite.eventId] });
    }
    return updatedInvite;
  }

  async createSharedEventMember(input: SharedEventMemberInput) {
    const snapshot = await loadSnapshot(this.db);
    if (input.linkedUserId) {
      const duplicateLinked = snapshot.sharedEventMembers.find(
        (member) =>
          member.eventId === input.eventId &&
          member.linkedUserId === input.linkedUserId &&
          member.status !== 'merged' &&
          member.status !== 'archived',
      );
      if (duplicateLinked) {
        throw new Error('This linked user is already an event member.');
      }
    }

    const timestamp = nowIso();
    const member: SharedEventMember = {
      id: createId('event_member'),
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: input.remoteEventId ?? null,
      type: input.type ?? (input.linkedUserId ? 'linked_user' : 'unlinked_placeholder'),
      linkedUserId: cleanOptional(input.linkedUserId),
      displayName: input.displayName.trim(),
      alias: cleanOptional(input.alias),
      email: cleanOptional(input.email),
      phone: cleanOptional(input.phone),
      notes: cleanOptional(input.notes),
      createdByUserId: cleanOptional(input.createdByUserId),
      status: input.status ?? 'active',
      mergedIntoEventMemberId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: input.syncStatus ?? (input.remoteId ? 'synced' : 'pending_upload'),
    };
    await insertSharedEventMember(this.db, member);
    await this.reconcileEventDuplicateWarnings(member.eventId);
    await this.logEventActivity(member.eventId, 'event_member_added', member.createdByUserId, 'event_member', member.id, {
      displayName: member.displayName,
      type: member.type,
    });
    if (member.syncStatus === 'pending_upload' || member.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'event_member', entityId: member.id, operation: 'create', payload: member, dependencyIds: [member.eventId] });
    }
    return member;
  }

  async updateSharedEventMember(member: SharedEventMember, input: Partial<SharedEventMemberInput> & { archived?: boolean }) {
    const timestamp = nowIso();
    const updated: SharedEventMember = {
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
    await insertSharedEventMember(this.db, updated);
    await this.reconcileEventDuplicateWarnings(updated.eventId);
    await this.logEventActivity(updated.eventId, 'event_member_edited', input.createdByUserId ?? null, 'event_member', updated.id, {
      displayName: updated.displayName,
      status: updated.status,
    });
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'event_member', entityId: updated.id, operation: input.archived ? 'archive' : 'update', payload: updated, dependencyIds: [updated.eventId] });
    }
    return updated;
  }

  async createEventMemberClaim(member: SharedEventMember, claimantUserId: string, message?: string | null, remoteId?: string | null) {
    const timestamp = nowIso();
    const claim: EventMemberClaim = {
      id: createId('event_claim'),
      remoteId: remoteId ?? null,
      eventId: member.eventId,
      remoteEventId: member.remoteEventId,
      eventMemberId: member.id,
      remoteEventMemberId: member.remoteId,
      claimantUserId,
      status: 'pending',
      message: cleanOptional(message),
      respondedByUserId: null,
      respondedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: remoteId ? 'synced' : 'pending_upload',
    };
    await insertEventMemberClaim(this.db, claim);
    await insertSharedEventMember(this.db, {
      ...member,
      status: 'claim_pending',
      updatedAt: timestamp,
      syncStatus: member.syncStatus === 'synced' ? 'pending_update' : member.syncStatus,
    });
    await this.logEventActivity(member.eventId, 'unlinked_member_claim_requested', claimantUserId, 'event_member_claim', claim.id, {
      eventMemberId: member.id,
      displayName: member.displayName,
    });
    if (claim.syncStatus === 'pending_upload' || claim.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'event_member_claim', entityId: claim.id, operation: 'create', payload: claim, dependencyIds: [member.id] });
    }
    return claim;
  }

  async respondToEventMemberClaim(
    claim: EventMemberClaim,
    member: SharedEventMember,
    status: Extract<EventMemberClaim['status'], 'approved' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) {
    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    if (status === 'approved') {
      const alreadyLinked = snapshot.sharedEventMembers.find(
        (item) =>
          item.eventId === claim.eventId &&
          item.linkedUserId === claim.claimantUserId &&
          item.id !== member.id &&
          item.status !== 'merged',
      );
      if (alreadyLinked) {
        throw new Error('This user is already linked to another member in this event.');
      }
    }

    const updatedClaim: EventMemberClaim = {
      ...claim,
      status,
      respondedByUserId: actorUserId,
      respondedAt: timestamp,
      updatedAt: timestamp,
      syncStatus: claim.remoteId ? 'pending_update' : claim.syncStatus,
    };
    await insertEventMemberClaim(this.db, updatedClaim);

    if (status === 'approved') {
      await insertSharedEventMember(this.db, {
        ...member,
        type: 'linked_user',
        linkedUserId: claim.claimantUserId,
        status: 'active',
        updatedAt: timestamp,
        syncStatus: member.remoteId ? 'pending_update' : member.syncStatus,
      });
    } else if (member.status === 'claim_pending') {
      await insertSharedEventMember(this.db, {
        ...member,
        status: 'active',
        updatedAt: timestamp,
        syncStatus: member.remoteId ? 'pending_update' : member.syncStatus,
      });
    }

    await this.logEventActivity(
      claim.eventId,
      status === 'approved' ? 'claim_approved' : status === 'rejected' ? 'claim_rejected' : 'claim_cancelled',
      actorUserId,
      'event_member_claim',
      claim.id,
      { eventMemberId: claim.eventMemberId, claimantUserId: claim.claimantUserId },
    );
    if (updatedClaim.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'event_member_claim', entityId: updatedClaim.id, operation: 'update', payload: updatedClaim, dependencyIds: [updatedClaim.eventMemberId] });
    }
    return updatedClaim;
  }

  async ignoreEventDuplicateWarning(warning: EventDuplicateWarning, actorUserId: string) {
    const timestamp = nowIso();
    const updated: EventDuplicateWarning = {
      ...warning,
      status: 'ignored',
      ignoredByUserId: actorUserId,
      updatedAt: timestamp,
      syncStatus: warning.remoteId ? 'pending_update' : warning.syncStatus,
    };
    await insertEventDuplicateWarning(this.db, updated);
    await this.logEventActivity(warning.eventId, 'duplicate_warning_ignored', actorUserId, 'event_duplicate_warning', warning.id, {
      eventMemberIdA: warning.eventMemberIdA,
      eventMemberIdB: warning.eventMemberIdB,
    });
    return updated;
  }

  async mergeSharedEventMembers(source: SharedEventMember, target: SharedEventMember, actorUserId: string) {
    if (source.type !== 'unlinked_placeholder' || target.type !== 'unlinked_placeholder') {
      throw new Error('Only unlinked event members can be merged.');
    }
    if (source.eventId !== target.eventId) {
      throw new Error('Members must belong to the same event.');
    }

    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    for (const expense of snapshot.sharedExpenses.filter((item) => item.eventId === source.eventId)) {
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

    for (const debt of snapshot.eventDebts.filter((item) => item.eventId === source.eventId)) {
      await insertEventDebt(this.db, {
        ...debt,
        debtorEventMemberId: debt.debtorEventMemberId === source.id ? target.id : debt.debtorEventMemberId,
        creditorEventMemberId: debt.creditorEventMemberId === source.id ? target.id : debt.creditorEventMemberId,
        syncStatus: debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus,
        updatedAt: timestamp,
      });
    }

    await insertSharedEventMember(this.db, {
      ...source,
      status: 'merged',
      mergedIntoEventMemberId: target.id,
      updatedAt: timestamp,
      syncStatus: source.remoteId ? 'pending_update' : source.syncStatus,
    });

    for (const warning of snapshot.eventDuplicateWarnings.filter(
      (item) =>
        item.eventId === source.eventId &&
        [item.eventMemberIdA, item.eventMemberIdB].includes(source.id) &&
        [item.eventMemberIdA, item.eventMemberIdB].includes(target.id),
    )) {
      await insertEventDuplicateWarning(this.db, {
        ...warning,
        status: 'resolved',
        updatedAt: timestamp,
        syncStatus: warning.remoteId ? 'pending_update' : warning.syncStatus,
      });
    }

    await this.reconcileEventDuplicateWarnings(source.eventId);
    await this.logEventActivity(source.eventId, 'members_merged', actorUserId, 'event_member', target.id, {
      sourceEventMemberId: source.id,
      targetEventMemberId: target.id,
      sourceDisplayName: source.displayName,
      targetDisplayName: target.displayName,
    });
    return { sourceId: source.id, targetId: target.id };
  }

  async createEventDebt(input: EventDebtInput) {
    const timestamp = nowIso();
    const debt: EventDebt = {
      id: createId('event_debt'),
      remoteId: input.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: input.remoteEventId ?? null,
      creatorUserId: cleanOptional(input.creatorUserId),
      debtorEventMemberId: input.debtorEventMemberId,
      creditorEventMemberId: input.creditorEventMemberId,
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
    await insertEventDebt(this.db, debt);
    await this.logEventActivity(debt.eventId, 'simple_debt_added', debt.creatorUserId, 'event_debt', debt.id, {
      amount: debt.amount,
      currency: debt.currency,
      title: debt.title,
    });
    if (debt.syncStatus === 'pending_upload' || debt.syncStatus === 'pending_create') {
      await this.queueSyncOperation({ entityType: 'event_debt', entityId: debt.id, operation: 'create', payload: debt, dependencyIds: [debt.eventId, debt.debtorEventMemberId, debt.creditorEventMemberId] });
    }
    return debt;
  }

  async updateEventDebt(debt: EventDebt, input: Partial<EventDebtInput>) {
    const timestamp = nowIso();
    const updated: EventDebt = {
      ...debt,
      remoteId: input.remoteId === undefined ? debt.remoteId : cleanOptional(input.remoteId),
      creatorUserId: input.creatorUserId === undefined ? debt.creatorUserId : cleanOptional(input.creatorUserId),
      debtorEventMemberId: input.debtorEventMemberId ?? debt.debtorEventMemberId,
      creditorEventMemberId: input.creditorEventMemberId ?? debt.creditorEventMemberId,
      amount: input.amount === undefined ? debt.amount : toAmount(input.amount),
      currency: input.currency ?? debt.currency,
      title: input.title?.trim() ?? debt.title,
      notes: input.notes === undefined ? debt.notes : cleanOptional(input.notes),
      debtDate: input.debtDate ?? debt.debtDate,
      dueDate: input.dueDate === undefined ? debt.dueDate : cleanOptional(input.dueDate),
      tags: input.tags === undefined ? debt.tags : cleanTags(input.tags),
      verificationStatus: input.verificationStatus ?? debt.verificationStatus,
      settlementStatus: input.settlementStatus ?? debt.settlementStatus,
      status: input.status ?? debt.status,
      archivedAt: input.status === 'archived' && !debt.archivedAt ? timestamp : debt.archivedAt,
      updatedAt: timestamp,
      syncStatus: input.syncStatus ?? (debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus),
    };
    await insertEventDebt(this.db, updated);
    await this.logEventActivity(updated.eventId, 'simple_debt_edited', updated.creatorUserId, 'event_debt', updated.id, {
      status: updated.status,
      verificationStatus: updated.verificationStatus,
    });
    if (updated.syncStatus === 'pending_update') {
      await this.queueSyncOperation({ entityType: 'event_debt', entityId: updated.id, operation: updated.status === 'archived' ? 'archive' : 'update', payload: updated, dependencyIds: [updated.eventId, updated.debtorEventMemberId, updated.creditorEventMemberId] });
    }
    return updated;
  }

  async respondToEventVerification(input: {
    eventId: string;
    targetType: EventVerificationResponse['targetType'];
    targetId: string;
    eventMemberId: string;
    linkedUserId: string;
    status: Extract<VerificationStatus, 'verified' | 'rejected'>;
    rejectionReason?: string | null;
  }) {
    const timestamp = nowIso();
    const snapshot = await loadSnapshot(this.db);
    const existing = snapshot.eventVerificationResponses.find(
      (response) =>
        response.eventId === input.eventId &&
        response.targetType === input.targetType &&
        response.targetId === input.targetId &&
        response.eventMemberId === input.eventMemberId,
    );
    const response: EventVerificationResponse = {
      id: existing?.id ?? createId('event_verify'),
      remoteId: existing?.remoteId ?? null,
      eventId: input.eventId,
      remoteEventId: existing?.remoteEventId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      remoteTargetId: existing?.remoteTargetId ?? null,
      eventMemberId: input.eventMemberId,
      linkedUserId: input.linkedUserId,
      responseStatus: input.status,
      rejectionReason: input.status === 'rejected' ? cleanOptional(input.rejectionReason) : null,
      respondedAt: timestamp,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      syncStatus: existing?.remoteId ? 'pending_update' : existing?.syncStatus ?? 'pending_upload',
    };
    await insertEventVerificationResponse(this.db, response);
    await this.deriveEventTargetVerification(input.eventId, input.targetType, input.targetId);
    await this.logEventActivity(
      input.eventId,
      input.status === 'verified' ? 'expense_verified' : 'expense_rejected',
      input.linkedUserId,
      input.targetType === 'debt' ? 'event_debt' : 'shared_expense',
      input.targetId,
      { eventMemberId: input.eventMemberId, rejectionReason: response.rejectionReason },
    );
    if (response.syncStatus === 'pending_upload' || response.syncStatus === 'pending_create' || response.syncStatus === 'pending_update') {
      await this.queueSyncOperation({
        entityType: 'event_verification',
        entityId: response.id,
        operation: response.remoteId ? 'update' : 'create',
        payload: response,
        dependencyIds: [response.eventId, response.eventMemberId, response.targetId],
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
      eventId: cleanOptional(input.eventId),
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
    if (attachment.eventId && attachment.visibility === 'shared') {
      await this.logEventActivity(attachment.eventId, 'attachment_added', attachment.createdByUserId, 'attachment', attachment.id, {
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
    if (attachment.eventId && attachment.visibility === 'shared') {
      await this.logEventActivity(attachment.eventId, 'attachment_removed', actorUserId ?? attachment.createdByUserId, 'attachment', attachment.id, {
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
      eventId: cleanOptional(input.eventId),
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
    if (comment.eventId && comment.visibility === 'shared') {
      await this.logEventActivity(comment.eventId, 'comment_added', comment.authorUserId, 'comment', comment.id, {
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
    if (comment.eventId && comment.visibility === 'shared') {
      await this.logEventActivity(comment.eventId, 'comment_edited', comment.authorUserId, 'comment', comment.id, {
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
    if (comment.eventId && comment.visibility === 'shared') {
      await this.logEventActivity(comment.eventId, 'comment_deleted', actorUserId ?? comment.authorUserId, 'comment', comment.id, {
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
    await insertProfile(this.db, profile);
    await this.logActivity('profile', profile.id, 'profile_updated', profile.id, {
      displayName: profile.displayName,
      baseCurrency: profile.baseCurrency,
    });
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
      requesterLabel: input.member.displayName,
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
      syncStatus: linkRequest.syncStatus,
      updatedAt: timestamp,
    });
    await this.logActivity('link_request', linkRequest.id, 'member_link_request_sent', input.requesterUserId, {
      memberId: input.member.id,
      targetEmail: linkRequest.targetEmail,
      targetPhone: linkRequest.targetPhone,
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

    const localMember = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM members WHERE id = ?`,
      [linkRequest.requesterMemberId],
    );

    if (localMember) {
      const members = await loadSnapshot(this.db).then((snapshot) => snapshot.members);
      const member = members.find((item) => item.id === linkRequest.requesterMemberId);
      if (member) {
        await insertMember(this.db, {
          ...member,
          linkStatus: status === 'accepted' ? 'linked' : status === 'rejected' ? 'link_rejected' : 'unlinked',
          linkedUserId: status === 'accepted' ? actorUserId : member.linkedUserId,
          syncStatus: 'pending_update',
          updatedAt: timestamp,
        });
      }
    }

    await this.logActivity('link_request', linkRequest.id, `member_link_${status}`, actorUserId, {
      memberId: linkRequest.requesterMemberId,
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
      status: 'pending',
      rejectionReason: null,
      suggestedChange: null,
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
    await this.logActivity('debt', input.debt.id, 'debt_verification_requested', input.requesterUserId, {
      responderUserId: input.responderUserId,
      verificationId: verification.id,
    });
    return { debt: updatedDebt, verification };
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

  async upsertEvent(event: Event) {
    await insertEvent(this.db, event);
    return event;
  }

  async upsertEventParticipant(participant: EventParticipant) {
    await insertEventParticipant(this.db, participant);
    return participant;
  }

  async upsertEventInvite(invite: EventInvite) {
    await insertEventInvite(this.db, invite);
    return invite;
  }

  async upsertSharedEventMember(member: SharedEventMember) {
    await insertSharedEventMember(this.db, member);
    return member;
  }

  async upsertEventMemberClaim(claim: EventMemberClaim) {
    await insertEventMemberClaim(this.db, claim);
    return claim;
  }

  async upsertEventDuplicateWarning(warning: EventDuplicateWarning) {
    await insertEventDuplicateWarning(this.db, warning);
    return warning;
  }

  async upsertEventDebt(debt: EventDebt) {
    await insertEventDebt(this.db, debt);
    return debt;
  }

  async upsertEventVerificationResponse(response: EventVerificationResponse) {
    await insertEventVerificationResponse(this.db, response);
    return response;
  }

  async upsertEventActivityLog(activity: EventActivityLog) {
    await insertEventActivityLog(this.db, activity);
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
    const eventScoped = Boolean(input.eventId);
    const payment: Payment = {
      id: createId('payment'),
      localId: null,
      remoteId: null,
      createdByUserId: cleanOptional(input.createdByUserId),
      payerUserId: null,
      payeeUserId: null,
      payerMemberId: eventScoped || input.payerId === 'me' ? null : input.payerId,
      payeeMemberId: eventScoped || input.payeeId === 'me' ? null : input.payeeId,
      payerEventMemberId: eventScoped ? input.payerId : null,
      payeeEventMemberId: eventScoped ? input.payeeId : null,
      eventId: input.eventId ?? null,
      relatedMemberId: input.relatedMemberId ?? (!eventScoped && input.payerId !== 'me' ? input.payerId : input.payeeId !== 'me' ? input.payeeId : null),
      amount: toAmount(input.amount),
      currency: input.currency,
      paymentDate: input.paymentDate || todayIsoDate(),
      notes: cleanOptional(input.notes),
      status: input.status ?? 'recorded',
      confirmationStatus: input.confirmationStatus ?? (eventScoped ? 'pending_confirmation' : 'local_only'),
      visibility: input.visibility ?? (eventScoped ? 'shared_event' : 'private'),
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      syncStatus: eventScoped ? 'pending_upload' : 'local_only',
    };
    const settlement: Settlement = {
      id: createId('settlement'),
      localId: null,
      remoteId: null,
      createdByUserId: payment.createdByUserId,
      eventId: input.eventId ?? null,
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

    let overpaymentCredit: OverpaymentCredit | null = null;
    if (overpaymentAmount > 0.005) {
      overpaymentCredit = {
        id: createId('overpayment'),
        createdByUserId: payment.createdByUserId,
        payerMemberId: payment.payerMemberId,
        payeeMemberId: payment.payeeMemberId,
        payerEventMemberId: payment.payerEventMemberId,
        payeeEventMemberId: payment.payeeEventMemberId,
        eventId: payment.eventId,
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
    if (payment.eventId) {
      await this.logEventActivity(payment.eventId, 'settlement_record_created', payment.createdByUserId, 'settlement', settlement.id, {
        paymentId: payment.id,
        lineCount: lines.length,
        overpaymentAmount,
      });
    }
    if (payment.syncStatus === 'pending_upload' || payment.syncStatus === 'pending_create') {
      await this.queueSyncOperation({
        entityType: 'payment',
        entityId: payment.id,
        operation: 'create',
        payload: payment,
        dependencyIds: [
          payment.eventId,
          payment.payerEventMemberId,
          payment.payeeEventMemberId,
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

  async createRecurringTemplate(input: CreateRecurringTemplateInput) {
    const timestamp = nowIso();
    const template: RecurringTemplate = {
      id: createId('recurring'),
      createdByUserId: cleanOptional(input.createdByUserId),
      eventId: cleanOptional(input.eventId),
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
          eventId: String(template.payload.eventId ?? template.eventId ?? ''),
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
            ? (template.payload.expensePayers as { eventMemberId: ParticipantId; amountPaid: number }[])
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
      relatedEventId: reminder.relatedEventId,
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
    await this.logActivity('debt', debt.id, status === 'verified' ? 'debt_verified' : 'debt_rejected', actorUserId, {
      verificationId: verification.id,
      rejectionReason: updatedVerification.rejectionReason,
      suggestedChange: updatedVerification.suggestedChange,
    });
    return { debt: updatedDebt, verification: updatedVerification };
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

  async logEventActivity(
    eventId: string,
    action: string,
    actorUserId: string | null,
    targetType: string,
    targetId: string | null,
    metadata: Record<string, unknown>,
  ) {
    const snapshot = await loadSnapshot(this.db);
    const event = snapshot.events.find((item) => item.id === eventId);
    await insertEventActivityLog(this.db, {
      id: createId('event_activity'),
      remoteId: null,
      eventId,
      remoteEventId: event?.remoteId ?? null,
      actorUserId,
      action,
      targetType,
      targetId,
      metadata,
      createdAt: nowIso(),
      syncStatus: event?.syncStatus === 'synced' ? 'pending_upload' : event?.syncStatus ?? 'local_only',
    });
  }

  private async reconcileEventDuplicateWarnings(eventId: string) {
    const snapshot = await loadSnapshot(this.db);
    const drafts = findSharedEventDuplicateWarningDrafts(eventId, snapshot.sharedEventMembers);
    const existingByPair = new Map(
      snapshot.eventDuplicateWarnings.map((warning) => [
        duplicatePairKey({
          eventId: warning.eventId,
          eventMemberIdA: warning.eventMemberIdA,
          eventMemberIdB: warning.eventMemberIdB,
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
      await insertEventDuplicateWarning(this.db, buildDuplicateWarning(draft, existing));
    }
  }

  private async deriveEventTargetVerification(
    eventId: string,
    targetType: EventVerificationResponse['targetType'],
    targetId: string,
  ) {
    const snapshot = await loadSnapshot(this.db);
    const responses = snapshot.eventVerificationResponses.filter(
      (response) => response.eventId === eventId && response.targetType === targetType && response.targetId === targetId,
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
      const debt = snapshot.eventDebts.find((item) => item.id === targetId);
      if (debt) {
        await insertEventDebt(this.db, {
          ...debt,
          verificationStatus: nextStatus,
          updatedAt: nowIso(),
          syncStatus: debt.syncStatus === 'synced' ? 'pending_update' : debt.syncStatus,
        });
      }
    }
  }
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
  payers: { eventMemberId: ParticipantId; amountPaid: number }[],
  currency: CurrencyCode,
  timestamp: string,
): ExpensePayer[] {
  return payers
    .filter((payer) => payer.eventMemberId && toAmount(payer.amountPaid) > 0)
    .map((payer, index) => ({
      id: `${expenseId}_payer_${payer.eventMemberId}_${index}`,
      expenseId,
      eventMemberId: payer.eventMemberId,
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

function hasEventUpdate(input: Partial<EventInput> & { archived?: boolean; ignoredDuplicateKeys?: string[] }) {
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
