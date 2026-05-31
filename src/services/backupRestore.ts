import type { DatabaseSnapshot } from '@/src/data/database';
import type {
  AppSettings,
  Attachment,
  AuditLog,
  Comment,
  CurrencyRate,
  Debt,
  Event,
  EventDebt,
  EventMember,
  ExpensePayer,
  Member,
  OverpaymentCredit,
  Payment,
  RecurringTemplate,
  Reminder,
  Settlement,
  SettlementLine,
  SharedEventMember,
  SharedExpense,
  SmartSuggestion,
  SoftReminder,
  UserProfile,
  BackupMode,
} from '@/src/types/models';
import { createId, nowIso } from '@/src/utils/id';

export type BackupOptions = {
  includeAttachments: boolean;
  includePrivateNotes: boolean;
};

export type DebtulatorBackup = {
  app: 'Debtulator';
  schemaVersion: 6;
  exportedAt: string;
  privacy: {
    includesAttachments: boolean;
    includesPrivateNotes: boolean;
    restoredRecordsDefaultPrivate: true;
  };
  data: Record<string, unknown>;
};

export type RestorePreview = {
  valid: boolean;
  schemaVersion: number | null;
  memberCount: number;
  debtCount: number;
  eventCount: number;
  paymentCount: number;
  settlementCount: number;
  warnings: string[];
};

export type RestoreResult = {
  mode: BackupMode;
  restored: {
    profiles: number;
    members: number;
    debts: number;
    events: number;
    eventMembers: number;
    sharedEventMembers: number;
    sharedExpenses: number;
    eventDebts: number;
    payments: number;
    settlements: number;
    settlementLines: number;
    attachments: number;
    comments: number;
    recurringTemplates: number;
    reminders: number;
    softReminders: number;
    overpaymentCredits: number;
    smartSuggestions: number;
    auditLogs: number;
    currencyRates: number;
  };
  skipped: number;
  warnings: string[];
};

export type RestoreApplyPlan = {
  result: RestoreResult;
  settings: Partial<AppSettings> | null;
  records: {
    profiles: UserProfile[];
    members: Member[];
    debts: Debt[];
    events: Event[];
    eventMembers: EventMember[];
    sharedEventMembers: SharedEventMember[];
    sharedExpenses: SharedExpense[];
    eventDebts: EventDebt[];
    payments: Payment[];
    settlements: Settlement[];
    settlementLines: SettlementLine[];
    attachments: Attachment[];
    comments: Comment[];
    recurringTemplates: RecurringTemplate[];
    reminders: Reminder[];
    softReminders: SoftReminder[];
    overpaymentCredits: OverpaymentCredit[];
    smartSuggestions: SmartSuggestion[];
    auditLogs: AuditLog[];
    currencyRates: CurrencyRate[];
  };
};

type BackupData = {
  profiles: UserProfile[];
  members: Member[];
  debts: Debt[];
  events: Event[];
  eventMembers: EventMember[];
  sharedEventMembers: SharedEventMember[];
  sharedExpenses: SharedExpense[];
  eventDebts: EventDebt[];
  payments: Payment[];
  settlements: Settlement[];
  settlementLines: SettlementLine[];
  attachments: Attachment[];
  comments: Comment[];
  recurringTemplates: RecurringTemplate[];
  reminders: Reminder[];
  softReminders: SoftReminder[];
  overpaymentCredits: OverpaymentCredit[];
  smartSuggestions: SmartSuggestion[];
  auditLogs: AuditLog[];
  currencyRates: CurrencyRate[];
  settings: Partial<AppSettings> | null;
};

export function buildBackup(snapshot: DatabaseSnapshot, options: BackupOptions): DebtulatorBackup {
  return {
    app: 'Debtulator',
    schemaVersion: 6,
    exportedAt: new Date().toISOString(),
    privacy: {
      includesAttachments: options.includeAttachments,
      includesPrivateNotes: options.includePrivateNotes,
      restoredRecordsDefaultPrivate: true,
    },
    data: {
      profiles: snapshot.profiles,
      members: snapshot.members.map((member) => scrubNotes(member, options.includePrivateNotes)),
      debts: snapshot.debts.map((debt) => scrubNotes({ ...debt, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes)),
      events: snapshot.events.map((event) => scrubNotes({ ...event, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes)),
      eventMembers: snapshot.eventMembers,
      sharedEventMembers: snapshot.sharedEventMembers.map((member) => scrubNotes({ ...member, syncStatus: 'local_only' }, options.includePrivateNotes)),
      sharedExpenses: snapshot.sharedExpenses.map((expense) =>
        scrubNotes({ ...expense, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes),
      ),
      eventDebts: snapshot.eventDebts.map((debt) => scrubNotes({ ...debt, syncStatus: 'local_only' }, options.includePrivateNotes)),
      payments: snapshot.payments.map((payment) => scrubNotes({ ...payment, visibility: 'private', syncStatus: 'local_only' }, options.includePrivateNotes)),
      settlements: snapshot.settlements.map((settlement) => scrubNotes({ ...settlement, syncStatus: 'local_only' }, options.includePrivateNotes)),
      settlementLines: snapshot.settlementLines,
      expensePayers: snapshot.expensePayers,
      tags: snapshot.tags,
      comments: options.includePrivateNotes ? snapshot.comments.map((comment) => ({ ...comment, visibility: 'private', syncStatus: 'local_only' })) : [],
      attachments: options.includeAttachments ? snapshot.attachments.map((attachment) => ({ ...attachment, remoteUrl: null, storagePath: null })) : [],
      recurringTemplates: snapshot.recurringTemplates,
      reminders: snapshot.reminders,
      softReminders: snapshot.softReminders,
      overpaymentCredits: snapshot.overpaymentCredits,
      smartSuggestions: snapshot.smartSuggestions,
      settings: snapshot.settings,
      currencyRates: snapshot.currencyRates,
      auditLogs: snapshot.auditLogs,
    },
  };
}

export async function shareBackupFile(backup: DebtulatorBackup) {
  const FileSystem = await import('expo-file-system/legacy');
  const { Share } = await import('react-native');
  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error('No writable document directory is available for backup export.');
  }
  const fileUri = `${directory}debtulator-backup-${backup.exportedAt.slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));
  await Share.share({ url: fileUri, message: 'Debtulator backup export' });
  return fileUri;
}

export function previewRestore(rawJson: string): RestorePreview {
  try {
    const parsed = parseBackup(rawJson);
    const data = parsed.data as Record<string, unknown>;
    const warnings: string[] = [];
    if (parsed.privacy?.restoredRecordsDefaultPrivate !== true) {
      warnings.push('Shared metadata will be restored as private unless explicitly confirmed.');
    }
    warnings.push(...validateBackupData(data));
    return {
      valid: true,
      schemaVersion: parsed.schemaVersion,
      memberCount: countArray(data?.members),
      debtCount: countArray(data?.debts),
      eventCount: countArray(data?.events),
      paymentCount: countArray(data?.payments),
      settlementCount: countArray(data?.settlements),
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      schemaVersion: null,
      memberCount: 0,
      debtCount: 0,
      eventCount: 0,
      paymentCount: 0,
      settlementCount: 0,
      warnings: [error instanceof Error ? error.message : 'Backup file is not valid JSON.'],
    };
  }
}

export function buildRestorePlan(rawJson: string, current: DatabaseSnapshot, mode: BackupMode): RestoreApplyPlan {
  const backup = parseBackup(rawJson);
  const source = readBackupData(backup.data as Record<string, unknown>);
  const warnings = validateBackupData(backup.data as Record<string, unknown>);
  const idMap = new Map<string, string>();
  const existing = mode === 'replace_local' ? emptyExistingIds() : buildExistingIds(current);
  let skipped = 0;

  const records: RestoreApplyPlan['records'] = {
    profiles: [],
    members: [],
    debts: [],
    events: [],
    eventMembers: [],
    sharedEventMembers: [],
    sharedExpenses: [],
    eventDebts: [],
    payments: [],
    settlements: [],
    settlementLines: [],
    attachments: [],
    comments: [],
    recurringTemplates: [],
    reminders: [],
    softReminders: [],
    overpaymentCredits: [],
    smartSuggestions: [],
    auditLogs: [],
    currencyRates: source.currencyRates.filter(isCurrencyRate),
  };

  const shouldInsert = (kind: keyof ExistingIds, id: string) => {
    if (mode !== 'merge' || !existing[kind].has(id)) {
      return true;
    }
    skipped += 1;
    return false;
  };
  const mapEntityId = (id: string, prefix: string) => {
    if (mode === 'duplicate_private') {
      const existingMappedId = idMap.get(id);
      if (existingMappedId) {
        return existingMappedId;
      }
      const mapped = createId(prefix);
      idMap.set(id, mapped);
      return mapped;
    }
    idMap.set(id, id);
    return id;
  };

  for (const profile of source.profiles) {
    if (!isProfile(profile) || !shouldInsert('profiles', profile.id)) {
      continue;
    }
    records.profiles.push({
      ...profile,
      id: mapEntityId(profile.id, 'profile'),
      avatarUrl: null,
      updatedAt: nowIso(),
    });
  }

  for (const member of source.members) {
    if (!isMember(member) || !shouldInsert('members', member.id)) {
      continue;
    }
    records.members.push({
      ...member,
      id: mapEntityId(member.id, 'member'),
      remoteId: null,
      linkedUserId: null,
      linkStatus: 'unlinked',
      linkRequestId: null,
      linkedProfileDisplayName: null,
      linkedProfileEmail: null,
      linkedProfilePhone: null,
      syncStatus: 'local_only',
      updatedAt: nowIso(),
    });
  }

  for (const event of source.events) {
    if (!isEvent(event) || !shouldInsert('events', event.id)) {
      continue;
    }
    records.events.push({
      ...event,
      id: mapEntityId(event.id, 'event'),
      localId: null,
      remoteId: null,
      ownerUserId: null,
      visibility: 'private',
      syncStatus: 'local_only',
      lockedAt: null,
      updatedAt: nowIso(),
    });
  }

  for (const eventMember of source.eventMembers) {
    const eventId = restoreRef(eventMember.eventId, idMap, existing.events);
    const memberId = restoreRef(eventMember.memberId, idMap, existing.members);
    if (!eventId || !memberId || !shouldInsert('eventMembers', `${eventMember.eventId}:${eventMember.memberId}`)) {
      skipped += eventId && memberId ? 0 : 1;
      continue;
    }
    records.eventMembers.push({ ...eventMember, eventId, memberId });
  }

  for (const member of source.sharedEventMembers) {
    if (!isSharedEventMember(member) || !shouldInsert('sharedEventMembers', member.id)) {
      continue;
    }
    const eventId = restoreRef(member.eventId, idMap, existing.events);
    if (!eventId) {
      skipped += 1;
      continue;
    }
    const id = mapEntityId(member.id, 'event_member');
    records.sharedEventMembers.push({
      ...member,
      id,
      remoteId: null,
      eventId,
      remoteEventId: null,
      type: 'unlinked_placeholder',
      linkedUserId: null,
      createdByUserId: null,
      syncStatus: 'local_only',
      updatedAt: nowIso(),
    });
  }

  for (const debt of source.debts) {
    if (!isDebt(debt) || !shouldInsert('debts', debt.id)) {
      continue;
    }
    const memberId = restoreRef(debt.memberId, idMap, existing.members);
    const eventId = debt.eventId ? restoreRef(debt.eventId, idMap, existing.events) : null;
    if (!memberId || (debt.eventId && !eventId)) {
      skipped += 1;
      continue;
    }
    records.debts.push({
      ...debt,
      id: mapEntityId(debt.id, 'debt'),
      memberId,
      eventId,
      remoteId: null,
      verificationRequestId: null,
      visibility: 'private',
      syncStatus: 'local_only',
      verificationStatus: 'local_only',
      verifiedByUserId: null,
      verifiedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      disputeReason: null,
      resolutionNote: null,
      suggestedChange: null,
      updatedAt: nowIso(),
    });
  }

  for (const expense of source.sharedExpenses) {
    if (!isSharedExpense(expense) || !shouldInsert('sharedExpenses', expense.id)) {
      continue;
    }
    const eventId = restoreRef(expense.eventId, idMap, existing.events);
    if (!eventId) {
      skipped += 1;
      continue;
    }
    const id = mapEntityId(expense.id, 'expense');
    const participantIds = expense.participantIds
      .map((participantId) => restoreParticipantId(participantId, idMap, existing.sharedEventMembers))
      .filter(Boolean) as string[];
    const payerId = restoreParticipantId(expense.payerId, idMap, existing.sharedEventMembers);
    if (!payerId || participantIds.length === 0) {
      skipped += 1;
      continue;
    }
    const generatedObligations = expense.generatedObligations.map((obligation) => {
      const obligationId = mode === 'duplicate_private' ? createId('obligation') : obligation.id;
      idMap.set(obligation.id, obligationId);
      return {
        ...obligation,
        id: obligationId,
        expenseId: id,
        eventId,
        fromParticipantId:
          restoreParticipantId(obligation.fromParticipantId, idMap, existing.sharedEventMembers) ??
          obligation.fromParticipantId,
        toParticipantId:
          restoreParticipantId(obligation.toParticipantId, idMap, existing.sharedEventMembers) ??
          obligation.toParticipantId,
      };
    });
    records.sharedExpenses.push({
      ...expense,
      id,
      remoteId: null,
      eventId,
      creatorUserId: null,
      payerId,
      participantIds,
      splitAllocations: remapNumberMap(expense.splitAllocations, idMap, existing.sharedEventMembers),
      generatedObligations,
      expensePayers: expense.expensePayers.map((payer) => sanitizeExpensePayer(payer, id, idMap, existing)),
      visibility: 'private',
      syncStatus: 'local_only',
      verificationStatus: 'local_only',
      updatedAt: nowIso(),
    });
  }

  for (const debt of source.eventDebts) {
    if (!isEventDebt(debt) || !shouldInsert('eventDebts', debt.id)) {
      continue;
    }
    const eventId = restoreRef(debt.eventId, idMap, existing.events);
    const debtorEventMemberId = restoreRef(debt.debtorEventMemberId, idMap, existing.sharedEventMembers);
    const creditorEventMemberId = restoreRef(debt.creditorEventMemberId, idMap, existing.sharedEventMembers);
    if (!eventId || !debtorEventMemberId || !creditorEventMemberId) {
      skipped += 1;
      continue;
    }
    records.eventDebts.push({
      ...debt,
      id: mapEntityId(debt.id, 'event_debt'),
      remoteId: null,
      eventId,
      remoteEventId: null,
      creatorUserId: null,
      debtorEventMemberId,
      creditorEventMemberId,
      syncStatus: 'local_only',
      verificationStatus: 'local_only',
      updatedAt: nowIso(),
    });
  }

  for (const payment of source.payments) {
    if (!isPayment(payment) || !shouldInsert('payments', payment.id)) {
      continue;
    }
    const restored = sanitizePayment(payment, idMap, existing, mode);
    if (!restored) {
      skipped += 1;
      continue;
    }
    records.payments.push(restored);
  }

  for (const settlement of source.settlements) {
    if (!isSettlement(settlement) || !shouldInsert('settlements', settlement.id)) {
      continue;
    }
    const restored = sanitizeSettlement(settlement, idMap, existing, mode);
    if (!restored) {
      skipped += 1;
      continue;
    }
    records.settlements.push(restored);
  }

  for (const credit of source.overpaymentCredits) {
    if (isOverpaymentCredit(credit)) {
      mapEntityId(credit.id, 'overpayment');
    }
  }

  for (const line of source.settlementLines) {
    if (!isSettlementLine(line) || !shouldInsert('settlementLines', line.id)) {
      continue;
    }
    const restored = sanitizeSettlementLine(line, idMap, existing, mode);
    if (!restored) {
      skipped += 1;
      continue;
    }
    records.settlementLines.push(restored);
  }

  for (const template of source.recurringTemplates) {
    if (!isRecurringTemplate(template) || !shouldInsert('recurringTemplates', template.id)) {
      continue;
    }
    const eventId = template.eventId ? restoreRef(template.eventId, idMap, existing.events) : null;
    const memberId = template.memberId ? restoreRef(template.memberId, idMap, existing.members) : null;
    if ((template.eventId && !eventId) || (template.memberId && !memberId)) {
      skipped += 1;
      continue;
    }
    records.recurringTemplates.push({
      ...template,
      id: mapEntityId(template.id, 'recurring'),
      createdByUserId: null,
      eventId,
      memberId,
      payload: remapPayload(template.payload, idMap, existing),
      updatedAt: nowIso(),
    });
  }

  for (const reminder of source.reminders) {
    if (!isReminder(reminder) || !shouldInsert('reminders', reminder.id)) {
      continue;
    }
    const targetId = restoreTargetRef(reminder.targetType, reminder.targetId, idMap, existing);
    if (!targetId) {
      skipped += 1;
      continue;
    }
    records.reminders.push({
      ...reminder,
      id: mapEntityId(reminder.id, 'reminder'),
      userId: null,
      targetId,
      updatedAt: nowIso(),
    });
  }

  for (const reminder of source.softReminders) {
    if (!isSoftReminder(reminder) || !shouldInsert('softReminders', reminder.id)) {
      continue;
    }
    records.softReminders.push({
      ...reminder,
      id: mapEntityId(reminder.id, 'soft_reminder'),
      senderUserId: null,
      recipientUserId: null,
      relatedMemberId: reminder.relatedMemberId ? restoreRef(reminder.relatedMemberId, idMap, existing.members) : null,
      relatedEventId: reminder.relatedEventId ? restoreRef(reminder.relatedEventId, idMap, existing.events) : null,
      relatedRecordId: reminder.relatedRecordId ? idMap.get(reminder.relatedRecordId) ?? reminder.relatedRecordId : null,
      updatedAt: nowIso(),
    });
  }

  for (const credit of source.overpaymentCredits) {
    if (!isOverpaymentCredit(credit) || !shouldInsert('overpaymentCredits', credit.id)) {
      continue;
    }
    const sourcePaymentId = restoreRef(credit.sourcePaymentId, idMap, existing.payments);
    if (!sourcePaymentId) {
      skipped += 1;
      continue;
    }
    records.overpaymentCredits.push({
      ...credit,
      id: mapEntityId(credit.id, 'overpayment'),
      createdByUserId: null,
      payerMemberId: credit.payerMemberId ? restoreRef(credit.payerMemberId, idMap, existing.members) : null,
      payeeMemberId: credit.payeeMemberId ? restoreRef(credit.payeeMemberId, idMap, existing.members) : null,
      payerEventMemberId: credit.payerEventMemberId
        ? restoreRef(credit.payerEventMemberId, idMap, existing.sharedEventMembers)
        : null,
      payeeEventMemberId: credit.payeeEventMemberId
        ? restoreRef(credit.payeeEventMemberId, idMap, existing.sharedEventMembers)
        : null,
      eventId: credit.eventId ? restoreRef(credit.eventId, idMap, existing.events) : null,
      sourcePaymentId,
      updatedAt: nowIso(),
    });
  }

  for (const comment of source.comments) {
    if (isComment(comment)) {
      mapEntityId(comment.id, 'comment');
    }
  }

  for (const attachment of source.attachments) {
    if (!isAttachment(attachment) || !shouldInsert('attachments', attachment.id)) {
      continue;
    }
    const targetId = restoreTargetRef(attachment.targetType, attachment.targetId, idMap, existing);
    const eventId = attachment.eventId ? restoreRef(attachment.eventId, idMap, existing.events) : null;
    if (!targetId || (attachment.eventId && !eventId)) {
      skipped += 1;
      continue;
    }
    records.attachments.push({
      ...attachment,
      id: mapEntityId(attachment.id, 'attachment'),
      remoteId: null,
      targetId,
      eventId,
      createdByUserId: null,
      localUri: null,
      remoteUrl: null,
      storagePath: null,
      visibility: 'private',
      thumbnailUri: null,
      syncStatus: 'local_only',
      updatedAt: nowIso(),
    });
  }

  for (const comment of source.comments) {
    if (!isComment(comment) || !shouldInsert('comments', comment.id)) {
      continue;
    }
    const targetId = restoreTargetRef(comment.targetType, comment.targetId, idMap, existing);
    const eventId = comment.eventId ? restoreRef(comment.eventId, idMap, existing.events) : null;
    if (!targetId || (comment.eventId && !eventId)) {
      skipped += 1;
      continue;
    }
    records.comments.push({
      ...comment,
      id: mapEntityId(comment.id, 'comment'),
      remoteId: null,
      targetId,
      eventId,
      authorUserId: null,
      visibility: 'private',
      syncStatus: 'local_only',
      updatedAt: nowIso(),
    });
  }

  for (const suggestion of source.smartSuggestions) {
    if (!isSmartSuggestion(suggestion) || !shouldInsert('smartSuggestions', suggestion.id)) {
      continue;
    }
    records.smartSuggestions.push({
      ...suggestion,
      id: mapEntityId(suggestion.id, 'suggestion'),
      userId: null,
      targetId: suggestion.targetId ? idMap.get(suggestion.targetId) ?? suggestion.targetId : null,
      updatedAt: nowIso(),
    });
  }

  for (const auditLog of source.auditLogs) {
    if (!isAuditLog(auditLog) || !shouldInsert('auditLogs', auditLog.id)) {
      continue;
    }
    records.auditLogs.push({
      ...auditLog,
      id: mapEntityId(auditLog.id, 'audit'),
      actorUserId: null,
      targetId: auditLog.targetId ? idMap.get(auditLog.targetId) ?? auditLog.targetId : null,
      eventId: auditLog.eventId ? restoreRef(auditLog.eventId, idMap, existing.events) : null,
      metadata: { ...auditLog.metadata, restoredFromBackup: true },
      deviceId: null,
    });
  }

  return {
    result: {
      mode,
      restored: {
        profiles: records.profiles.length,
        members: records.members.length,
        debts: records.debts.length,
        events: records.events.length,
        eventMembers: records.eventMembers.length,
        sharedEventMembers: records.sharedEventMembers.length,
        sharedExpenses: records.sharedExpenses.length,
        eventDebts: records.eventDebts.length,
        payments: records.payments.length,
        settlements: records.settlements.length,
        settlementLines: records.settlementLines.length,
        attachments: records.attachments.length,
        comments: records.comments.length,
        recurringTemplates: records.recurringTemplates.length,
        reminders: records.reminders.length,
        softReminders: records.softReminders.length,
        overpaymentCredits: records.overpaymentCredits.length,
        smartSuggestions: records.smartSuggestions.length,
        auditLogs: records.auditLogs.length,
        currencyRates: records.currencyRates.length,
      },
      skipped,
      warnings,
    },
    settings: sanitizeRestoredSettings(source.settings),
    records,
  };
}

export function restoreModeDescription(mode: BackupMode) {
  switch (mode) {
    case 'merge':
      return 'Merge safe local/private copies into the current device ledger.';
    case 'replace_local':
      return 'Replace local data after confirmation; synced history is not overwritten blindly.';
    case 'duplicate_private':
      return 'Import every restored record as a separate private copy.';
  }
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function parseBackup(rawJson: string): DebtulatorBackup {
  let parsed: Partial<DebtulatorBackup>;
  try {
    parsed = JSON.parse(rawJson) as Partial<DebtulatorBackup>;
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
  if (parsed.app !== 'Debtulator') {
    throw new Error('This does not look like a Debtulator backup.');
  }
  if (parsed.schemaVersion !== 6) {
    throw new Error('Backup schema differs from this app version.');
  }
  if (!isRecord(parsed.data)) {
    throw new Error('Backup file does not contain restorable data.');
  }
  return parsed as DebtulatorBackup;
}

function readBackupData(data: Record<string, unknown>): BackupData {
  return {
    profiles: readArray(data.profiles),
    members: readArray(data.members),
    debts: readArray(data.debts),
    events: readArray(data.events),
    eventMembers: readArray(data.eventMembers),
    sharedEventMembers: readArray(data.sharedEventMembers),
    sharedExpenses: readArray(data.sharedExpenses),
    eventDebts: readArray(data.eventDebts),
    payments: readArray(data.payments),
    settlements: readArray(data.settlements),
    settlementLines: readArray(data.settlementLines),
    attachments: readArray(data.attachments),
    comments: readArray(data.comments),
    recurringTemplates: readArray(data.recurringTemplates),
    reminders: readArray(data.reminders),
    softReminders: readArray(data.softReminders),
    overpaymentCredits: readArray(data.overpaymentCredits),
    smartSuggestions: readArray(data.smartSuggestions),
    auditLogs: readArray(data.auditLogs),
    currencyRates: readArray(data.currencyRates),
    settings: isRecord(data.settings) ? data.settings as Partial<AppSettings> : null,
  };
}

function validateBackupData(data: Record<string, unknown>) {
  const warnings: string[] = [];
  for (const key of ['members', 'debts', 'events', 'payments', 'settlements']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      warnings.push(`Backup ${key} section is not an array and will be ignored.`);
    }
  }
  if (
    !countArray(data.members) &&
    !countArray(data.debts) &&
    !countArray(data.events) &&
    !countArray(data.payments) &&
    !countArray(data.settlements)
  ) {
    warnings.push('Backup contains no core ledger records.');
  }
  return warnings;
}

type ExistingIds = {
  profiles: Set<string>;
  members: Set<string>;
  debts: Set<string>;
  events: Set<string>;
  eventMembers: Set<string>;
  sharedEventMembers: Set<string>;
  sharedExpenses: Set<string>;
  eventDebts: Set<string>;
  payments: Set<string>;
  settlements: Set<string>;
  settlementLines: Set<string>;
  attachments: Set<string>;
  comments: Set<string>;
  recurringTemplates: Set<string>;
  reminders: Set<string>;
  softReminders: Set<string>;
  overpaymentCredits: Set<string>;
  smartSuggestions: Set<string>;
  auditLogs: Set<string>;
};

function buildExistingIds(snapshot: DatabaseSnapshot): ExistingIds {
  return {
    profiles: ids(snapshot.profiles),
    members: ids(snapshot.members),
    debts: ids(snapshot.debts),
    events: ids(snapshot.events),
    eventMembers: new Set(snapshot.eventMembers.map((member) => `${member.eventId}:${member.memberId}`)),
    sharedEventMembers: ids(snapshot.sharedEventMembers),
    sharedExpenses: ids(snapshot.sharedExpenses),
    eventDebts: ids(snapshot.eventDebts),
    payments: ids(snapshot.payments),
    settlements: ids(snapshot.settlements),
    settlementLines: ids(snapshot.settlementLines),
    attachments: ids(snapshot.attachments),
    comments: ids(snapshot.comments),
    recurringTemplates: ids(snapshot.recurringTemplates),
    reminders: ids(snapshot.reminders),
    softReminders: ids(snapshot.softReminders),
    overpaymentCredits: ids(snapshot.overpaymentCredits),
    smartSuggestions: ids(snapshot.smartSuggestions),
    auditLogs: ids(snapshot.auditLogs),
  };
}

function emptyExistingIds(): ExistingIds {
  return {
    profiles: new Set(),
    members: new Set(),
    debts: new Set(),
    events: new Set(),
    eventMembers: new Set(),
    sharedEventMembers: new Set(),
    sharedExpenses: new Set(),
    eventDebts: new Set(),
    payments: new Set(),
    settlements: new Set(),
    settlementLines: new Set(),
    attachments: new Set(),
    comments: new Set(),
    recurringTemplates: new Set(),
    reminders: new Set(),
    softReminders: new Set(),
    overpaymentCredits: new Set(),
    smartSuggestions: new Set(),
    auditLogs: new Set(),
  };
}

function ids(records: { id: string }[]) {
  return new Set(records.map((record) => record.id));
}

function restoreRef(id: string, idMap: Map<string, string>, existingIds: Set<string>) {
  return idMap.get(id) ?? (existingIds.has(id) ? id : null);
}

function restoreParticipantId(id: string, idMap: Map<string, string>, existingIds: Set<string>) {
  return id === 'me' ? 'me' : restoreRef(id, idMap, existingIds);
}

function restoreTargetRef(
  targetType: string,
  targetId: string,
  idMap: Map<string, string>,
  existing: ExistingIds,
) {
  switch (targetType) {
    case 'debt':
      return restoreRef(targetId, idMap, existing.debts);
    case 'shared_expense':
      return restoreRef(targetId, idMap, existing.sharedExpenses);
    case 'event_debt':
      return restoreRef(targetId, idMap, existing.eventDebts);
    case 'payment':
      return restoreRef(targetId, idMap, existing.payments);
    case 'settlement':
      return restoreRef(targetId, idMap, existing.settlements);
    case 'event':
      return restoreRef(targetId, idMap, existing.events);
    case 'recurring_template':
      return restoreRef(targetId, idMap, existing.recurringTemplates);
    default:
      return idMap.get(targetId) ?? targetId;
  }
}

function sanitizeExpensePayer(
  payer: ExpensePayer,
  expenseId: string,
  idMap: Map<string, string>,
  existing: ExistingIds,
): ExpensePayer {
  return {
    ...payer,
    id: idMap.has(payer.id) ? idMap.get(payer.id)! : createId('expense_payer'),
    expenseId,
    eventMemberId:
      restoreParticipantId(payer.eventMemberId, idMap, existing.sharedEventMembers) ?? payer.eventMemberId,
    updatedAt: nowIso(),
  };
}

function sanitizePayment(
  payment: Payment,
  idMap: Map<string, string>,
  existing: ExistingIds,
  mode: BackupMode,
): Payment | null {
  const eventId = payment.eventId ? restoreRef(payment.eventId, idMap, existing.events) : null;
  const relatedMemberId = payment.relatedMemberId ? restoreRef(payment.relatedMemberId, idMap, existing.members) : null;
  const payerMemberId = payment.payerMemberId ? restoreRef(payment.payerMemberId, idMap, existing.members) : null;
  const payeeMemberId = payment.payeeMemberId ? restoreRef(payment.payeeMemberId, idMap, existing.members) : null;
  const payerEventMemberId = payment.payerEventMemberId
    ? restoreRef(payment.payerEventMemberId, idMap, existing.sharedEventMembers)
    : null;
  const payeeEventMemberId = payment.payeeEventMemberId
    ? restoreRef(payment.payeeEventMemberId, idMap, existing.sharedEventMembers)
    : null;
  if (
    (payment.eventId && !eventId) ||
    (payment.relatedMemberId && !relatedMemberId) ||
    (payment.payerMemberId && !payerMemberId) ||
    (payment.payeeMemberId && !payeeMemberId) ||
    (payment.payerEventMemberId && !payerEventMemberId) ||
    (payment.payeeEventMemberId && !payeeEventMemberId)
  ) {
    return null;
  }
  return {
    ...payment,
    id: mapPaymentId(payment.id, idMap, mode),
    localId: null,
    remoteId: null,
    createdByUserId: null,
    payerUserId: null,
    payeeUserId: null,
    payerMemberId,
    payeeMemberId,
    payerEventMemberId,
    payeeEventMemberId,
    eventId,
    relatedMemberId,
    visibility: 'private',
    confirmationStatus: 'local_only',
    syncStatus: 'local_only',
    updatedAt: nowIso(),
  };
}

function mapPaymentId(id: string, idMap: Map<string, string>, mode: BackupMode) {
  if (mode !== 'duplicate_private') {
    idMap.set(id, id);
    return id;
  }
  const mapped = idMap.get(id) ?? createId('payment');
  idMap.set(id, mapped);
  return mapped;
}

function sanitizeSettlement(
  settlement: Settlement,
  idMap: Map<string, string>,
  existing: ExistingIds,
  mode: BackupMode,
): Settlement | null {
  const eventId = settlement.eventId ? restoreRef(settlement.eventId, idMap, existing.events) : null;
  const memberId = settlement.memberId ? restoreRef(settlement.memberId, idMap, existing.members) : null;
  if ((settlement.eventId && !eventId) || (settlement.memberId && !memberId)) {
    return null;
  }
  const id = mode === 'duplicate_private' ? idMap.get(settlement.id) ?? createId('settlement') : settlement.id;
  idMap.set(settlement.id, id);
  return {
    ...settlement,
    id,
    localId: null,
    remoteId: null,
    createdByUserId: null,
    eventId,
    memberId,
    confirmationStatus: 'local_only',
    syncStatus: 'local_only',
    updatedAt: nowIso(),
  };
}

function sanitizeSettlementLine(
  line: SettlementLine,
  idMap: Map<string, string>,
  existing: ExistingIds,
  mode: BackupMode,
): SettlementLine | null {
  const settlementId = restoreRef(line.settlementId, idMap, existing.settlements);
  const paymentId = line.paymentId ? restoreRef(line.paymentId, idMap, existing.payments) : null;
  const sourceRecordId = restoreSourceRecordRef(line.sourceRecordType, line.sourceRecordId, idMap, existing);
  if (!settlementId || (line.paymentId && !paymentId) || !sourceRecordId) {
    return null;
  }
  return {
    ...line,
    id: mode === 'duplicate_private' ? createId('settlement_line') : line.id,
    remoteId: null,
    settlementId,
    paymentId,
    sourceRecordId,
    syncStatus: 'local_only',
    updatedAt: nowIso(),
  };
}

function restoreSourceRecordRef(
  sourceRecordType: SettlementLine['sourceRecordType'],
  sourceRecordId: string,
  idMap: Map<string, string>,
  existing: ExistingIds,
) {
  switch (sourceRecordType) {
    case 'simple_debt':
      return restoreRef(sourceRecordId, idMap, existing.debts);
    case 'event_debt':
      return restoreRef(sourceRecordId, idMap, existing.eventDebts);
    case 'shared_expense_obligation':
    case 'overpayment_credit':
      return idMap.get(sourceRecordId) ?? sourceRecordId;
  }
}

function remapNumberMap(
  values: Record<string, number>,
  idMap: Map<string, string>,
  existingIds: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [restoreParticipantId(key, idMap, existingIds), value] as const)
      .filter(([key]) => Boolean(key)),
  ) as Record<string, number>;
}

function remapPayload(
  payload: Record<string, unknown>,
  idMap: Map<string, string>,
  existing: ExistingIds,
) {
  const next = { ...payload };
  for (const key of ['memberId', 'payerId', 'payeeId']) {
    if (typeof next[key] === 'string') {
      next[key] = restoreParticipantId(next[key], idMap, existing.members) ?? next[key];
    }
  }
  if (typeof next.eventId === 'string') {
    next.eventId = restoreRef(next.eventId, idMap, existing.events) ?? next.eventId;
  }
  return next;
}

function sanitizeRestoredSettings(settings: Partial<AppSettings> | null): Partial<AppSettings> | null {
  if (!settings) {
    return null;
  }
  return {
    ...settings,
    defaultDebtVisibility: 'private',
    defaultEventVisibility: 'private',
    syncPrivateLocalDataToAccountBackup: false,
    uploadAttachmentsForSharedRecords: false,
  };
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter(isRecord) as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' && record[key] !== '';
}

function isProfile(value: unknown): value is UserProfile {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'displayName');
}

function isMember(value: unknown): value is Member {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'displayName');
}

function isDebt(value: unknown): value is Debt {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'memberId');
}

function isEvent(value: unknown): value is Event {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'name');
}

function isSharedEventMember(value: unknown): value is SharedEventMember {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'eventId');
}

function isSharedExpense(value: unknown): value is SharedExpense {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'eventId') &&
    Array.isArray(value.participantIds) &&
    Array.isArray(value.expensePayers) &&
    Array.isArray(value.generatedObligations) &&
    isRecord(value.splitAllocations)
  );
}

function isEventDebt(value: unknown): value is EventDebt {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'eventId');
}

function isPayment(value: unknown): value is Payment {
  return isRecord(value) && hasString(value, 'id') && typeof value.amount === 'number';
}

function isSettlement(value: unknown): value is Settlement {
  return isRecord(value) && hasString(value, 'id') && typeof value.totalAmount === 'number';
}

function isSettlementLine(value: unknown): value is SettlementLine {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'settlementId');
}

function isRecurringTemplate(value: unknown): value is RecurringTemplate {
  return isRecord(value) && hasString(value, 'id') && isRecord(value.payload);
}

function isReminder(value: unknown): value is Reminder {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'targetId');
}

function isSoftReminder(value: unknown): value is SoftReminder {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'message');
}

function isOverpaymentCredit(value: unknown): value is OverpaymentCredit {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'sourcePaymentId');
}

function isAttachment(value: unknown): value is Attachment {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'targetId');
}

function isComment(value: unknown): value is Comment {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'targetId');
}

function isSmartSuggestion(value: unknown): value is SmartSuggestion {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'title');
}

function isAuditLog(value: unknown): value is AuditLog {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'action');
}

function isCurrencyRate(value: unknown): value is CurrencyRate {
  return isRecord(value) && hasString(value, 'currency') && typeof value.rateToSek === 'number';
}

function scrubNotes<T extends { notes?: string | null; sharedNotes?: string | null }>(record: T, includePrivateNotes: boolean) {
  if (includePrivateNotes) {
    return record;
  }
  return {
    ...record,
    notes: null,
    sharedNotes: record.sharedNotes ?? null,
  };
}
