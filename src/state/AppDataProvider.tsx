import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  type DatabaseSnapshot,
  loadSnapshot,
  openDebtulatorDatabase,
} from '@/src/data/database';
import { DebtulatorRepository } from '@/src/data/repositories';
import { buildLedgerEntries, calculateMemberBalances, calculatePersonalTotals } from '@/src/services/ledger';
import type {
  AppSettings,
  Attachment,
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
  EventMemberClaim,
  EventParticipant,
  EventRole,
  EventStatus,
  EventVerificationResponse,
  ExportLog,
  ExportType,
  LedgerEntry,
  LinkRequest,
  Member,
  MoneyMap,
  Payment,
  ParticipantId,
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
  SyncStatus,
  SuggestedDebtChange,
  VerificationStatus,
  UserProfile,
} from '@/src/types/models';

type CreateMemberInput = {
  displayName: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedUserId?: string | null;
  linkStatus?: Member['linkStatus'];
  linkedProfileDisplayName?: string | null;
  linkedProfileEmail?: string | null;
  linkedProfilePhone?: string | null;
  tags?: string[];
};

type CreateDebtInput = {
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

type CreateEventInput = {
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
  syncStatus?: SyncStatus;
  memberIds?: string[];
};

type CreateExpenseInput = {
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

type CreateEventInviteInput = {
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

type CreateSharedEventMemberInput = {
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

type CreateEventDebtInput = {
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

type CreatePaymentSettlementInput = {
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

type CreateAttachmentInput = {
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

type CreateCommentInput = {
  targetType: CommentTargetType;
  targetId: string;
  eventId?: string | null;
  authorUserId?: string | null;
  localAuthorLabel?: string | null;
  body: string;
  visibility?: CommentVisibility;
  syncStatus?: SyncStatus;
};

type CreateSmartSuggestionInput = {
  userId?: string | null;
  suggestionType: SmartSuggestionType;
  targetType?: SmartSuggestion['targetType'];
  targetId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  status?: SmartSuggestionStatus;
};

type CreateExportLogInput = {
  userId?: string | null;
  exportType: ExportType;
  targetType?: ExportLog['targetType'];
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

type CreateCsvImportBatchInput = {
  userId?: string | null;
  status?: CsvImportBatch['status'];
  sourceName?: string | null;
  rowCount: number;
  importedMemberCount?: number;
  importedDebtCount?: number;
  errorCount?: number;
  metadata?: Record<string, unknown>;
};

type AppDataContextValue = DatabaseSnapshot & {
  ready: boolean;
  loading: boolean;
  error: string | null;
  ledgerEntries: LedgerEntry[];
  memberBalances: Record<string, MoneyMap>;
  personalTotals: ReturnType<typeof calculatePersonalTotals>;
  refresh: () => Promise<void>;
  resetLocalData: (seed?: boolean) => Promise<void>;
  upsertProfile: (profile: UserProfile) => Promise<UserProfile>;
  upsertLinkRequest: (linkRequest: LinkRequest) => Promise<LinkRequest>;
  upsertDebtVerification: (verification: DebtVerification) => Promise<DebtVerification>;
  upsertDebt: (debt: Debt) => Promise<Debt>;
  upsertSharedExpense: (expense: SharedExpense) => Promise<SharedExpense>;
  upsertEvent: (event: Event) => Promise<Event>;
  upsertEventParticipant: (participant: EventParticipant) => Promise<EventParticipant>;
  upsertEventInvite: (invite: EventInvite) => Promise<EventInvite>;
  upsertSharedEventMember: (member: SharedEventMember) => Promise<SharedEventMember>;
  upsertEventMemberClaim: (claim: EventMemberClaim) => Promise<EventMemberClaim>;
  upsertEventDuplicateWarning: (warning: EventDuplicateWarning) => Promise<EventDuplicateWarning>;
  upsertEventDebt: (debt: EventDebt) => Promise<EventDebt>;
  upsertEventVerificationResponse: (response: EventVerificationResponse) => Promise<EventVerificationResponse>;
  upsertEventActivityLog: (activity: EventActivityLog) => Promise<EventActivityLog>;
  upsertPayment: (payment: Payment) => Promise<Payment>;
  upsertSettlement: (settlement: Settlement) => Promise<Settlement>;
  upsertSettlementLine: (line: SettlementLine) => Promise<SettlementLine>;
  createMember: (input: CreateMemberInput) => Promise<Member>;
  updateMember: (memberId: string, input: Partial<CreateMemberInput> & { archived?: boolean }) => Promise<Member>;
  sendMemberLinkRequest: (
    memberId: string,
    input: {
      requesterUserId: string;
      targetUserId?: string | null;
      targetEmail?: string | null;
      targetPhone?: string | null;
      message?: string | null;
      remoteId?: string | null;
    },
  ) => Promise<LinkRequest>;
  respondToLinkRequest: (
    requestId: string,
    status: Extract<LinkRequest['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) => Promise<LinkRequest>;
  unlinkMember: (memberId: string, actorUserId?: string | null) => Promise<Member>;
  createDebt: (input: CreateDebtInput) => Promise<Debt>;
  updateDebt: (debtId: string, input: Partial<CreateDebtInput>) => Promise<Debt>;
  requestDebtVerification: (
    debtId: string,
    input: {
      requesterUserId: string;
      responderUserId: string;
      remoteDebtId?: string | null;
      remoteVerificationId?: string | null;
      sharedNotes?: string | null;
    },
  ) => Promise<{ debt: Debt; verification: DebtVerification }>;
  respondToDebtVerification: (
    verificationId: string,
    status: Extract<VerificationStatus, 'verified' | 'rejected'>,
    actorUserId: string,
    rejectionReason?: string | null,
    suggestedChange?: SuggestedDebtChange | null,
  ) => Promise<{ debt: Debt; verification: DebtVerification }>;
  markDebtDisputed: (debtId: string, actorUserId?: string | null, disputeReason?: string | null) => Promise<Debt>;
  markDebtResolved: (debtId: string, actorUserId?: string | null, resolutionNote?: string | null) => Promise<Debt>;
  cancelDebtVerification: (debtId: string, actorUserId?: string | null) => Promise<Debt>;
  createEvent: (input: CreateEventInput) => Promise<Event>;
  updateEvent: (
    eventId: string,
    input: Partial<CreateEventInput> & { archived?: boolean; ignoredDuplicateKeys?: string[] },
  ) => Promise<Event>;
  setEventMembers: (eventId: string, memberIds: string[]) => Promise<void>;
  createSharedExpense: (input: CreateExpenseInput) => Promise<SharedExpense>;
  updateSharedExpense: (expenseId: string, input: Partial<CreateExpenseInput>) => Promise<SharedExpense>;
  createEventInvite: (input: CreateEventInviteInput) => Promise<EventInvite>;
  respondToEventInvite: (
    inviteId: string,
    status: Extract<EventInvite['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
    actorDisplayName?: string | null,
    actorEmail?: string | null,
  ) => Promise<EventInvite>;
  createSharedEventMember: (input: CreateSharedEventMemberInput) => Promise<SharedEventMember>;
  updateSharedEventMember: (
    eventMemberId: string,
    input: Partial<CreateSharedEventMemberInput> & { archived?: boolean },
  ) => Promise<SharedEventMember>;
  createEventMemberClaim: (
    eventMemberId: string,
    claimantUserId: string,
    message?: string | null,
    remoteId?: string | null,
  ) => Promise<EventMemberClaim>;
  respondToEventMemberClaim: (
    claimId: string,
    status: Extract<EventMemberClaim['status'], 'approved' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) => Promise<EventMemberClaim>;
  ignoreEventDuplicateWarning: (warningId: string, actorUserId: string) => Promise<EventDuplicateWarning>;
  mergeSharedEventMembers: (
    sourceEventMemberId: string,
    targetEventMemberId: string,
    actorUserId: string,
  ) => Promise<{ sourceId: string; targetId: string }>;
  createEventDebt: (input: CreateEventDebtInput) => Promise<EventDebt>;
  updateEventDebt: (eventDebtId: string, input: Partial<CreateEventDebtInput>) => Promise<EventDebt>;
  createPaymentSettlement: (input: CreatePaymentSettlementInput) => Promise<{
    payment: Payment;
    settlement: Settlement;
    lines: SettlementLine[];
  }>;
  createRecurringTemplate: (input: CreateRecurringTemplateInput) => Promise<RecurringTemplate>;
  updateRecurringTemplate: (
    templateId: string,
    input: Partial<CreateRecurringTemplateInput> & { status?: RecurringTemplate['status'] },
  ) => Promise<RecurringTemplate>;
  generateDueRecurringRecords: () => Promise<string[]>;
  createReminder: (
    input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Reminder['status'] },
  ) => Promise<Reminder>;
  createSoftReminder: (
    input: Omit<SoftReminder, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SoftReminder['status'] },
  ) => Promise<SoftReminder>;
  createAttachment: (input: CreateAttachmentInput) => Promise<Attachment>;
  upsertAttachment: (attachment: Attachment) => Promise<Attachment>;
  archiveAttachment: (attachmentId: string, actorUserId?: string | null) => Promise<Attachment>;
  createComment: (input: CreateCommentInput) => Promise<Comment>;
  updateComment: (commentId: string, input: Partial<CreateCommentInput>) => Promise<Comment>;
  deleteComment: (commentId: string, actorUserId?: string | null) => Promise<Comment>;
  upsertSmartSuggestion: (input: SmartSuggestion | CreateSmartSuggestionInput) => Promise<SmartSuggestion>;
  setSmartSuggestionStatus: (suggestionId: string, status: SmartSuggestionStatus) => Promise<SmartSuggestion>;
  createExportLog: (input: CreateExportLogInput) => Promise<ExportLog>;
  createCsvImportBatch: (input: CreateCsvImportBatchInput) => Promise<CsvImportBatch>;
  respondToEventVerification: (input: {
    eventId: string;
    targetType: EventVerificationResponse['targetType'];
    targetId: string;
    eventMemberId: string;
    linkedUserId: string;
    status: Extract<VerificationStatus, 'verified' | 'rejected'>;
    rejectionReason?: string | null;
  }) => Promise<EventVerificationResponse>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateRate: (currency: CurrencyCode, rateToSek: number) => Promise<void>;
};

const emptySnapshot: DatabaseSnapshot = {
  profiles: [],
  members: [],
  debts: [],
  events: [],
  eventMembers: [],
  eventParticipants: [],
  eventInvites: [],
  sharedEventMembers: [],
  eventMemberClaims: [],
  eventDuplicateWarnings: [],
  sharedExpenses: [],
  eventDebts: [],
  payments: [],
  settlements: [],
  settlementLines: [],
  expensePayers: [],
  recurringTemplates: [],
  reminders: [],
  softReminders: [],
  overpaymentCredits: [],
  eventVerificationResponses: [],
  eventActivityLogs: [],
  linkRequests: [],
  debtVerifications: [],
  activityLogs: [],
  attachments: [],
  comments: [],
  smartSuggestions: [],
  exportLogs: [],
  csvImportBatches: [],
  tags: [],
  currencyRates: [],
  settings: {
    baseCurrency: 'SEK',
    showEstimatedBase: true,
    theme: 'system',
    convertedSettlementOptIn: false,
    defaultReminderPreference: 'none',
    recurringGenerationPreference: 'prompt',
    includePendingSettlements: false,
    includeRejectedDisputedSettlements: false,
    verifiedOnlySettlements: false,
    smartSuggestionsEnabled: true,
    analyticsEstimatedCurrencyMode: false,
    attachmentUploadPreference: 'ask',
    includePrivateNotesInExports: false,
    includeRejectedDisputedInExports: false,
    includeArchivedInExports: false,
    includeCommentsInExports: false,
    includeAttachmentsInExports: false,
  },
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot>(emptySnapshot);
  const [repository, setRepository] = useState<DebtulatorRepository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const { repo, loaded } = await withBootTimeout(
          (async () => {
            const db = await openDebtulatorDatabase();
            const repo = new DebtulatorRepository(db);
            const initial = await loadSnapshot(db);
            if (initial.settings.recurringGenerationPreference === 'auto') {
              await repo.generateDueRecurringRecords();
            }
            return {
              repo,
              loaded: await loadSnapshot(db),
            };
          })(),
          Platform.OS === 'web' ? 6000 : 20000,
          'Local database boot timed out. Continuing in local preview mode.',
        );

        if (mounted) {
          setRepository(repo);
          setSnapshot(loaded);
          setError(null);
        }
      } catch (bootError) {
        if (mounted) {
          setError(bootError instanceof Error ? bootError.message : 'Unable to open local database');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!repository) {
      return;
    }

    setSnapshot(await repository.load());
  }, [repository]);

  const runAndRefresh = useCallback(
    async <T,>(operation: (repo: DebtulatorRepository) => Promise<T>) => {
      if (!repository) {
        throw new Error('Local database is not ready yet.');
      }

      const result = await operation(repository);
      setSnapshot(await repository.load());
      return result;
    },
    [repository],
  );

  const ledgerEntries = useMemo(
    () =>
      buildLedgerEntries(
        snapshot.debts,
        snapshot.sharedExpenses,
        snapshot.eventDebts,
        snapshot.settlementLines,
        snapshot.payments,
        snapshot.overpaymentCredits,
      ),
    [
      snapshot.debts,
      snapshot.eventDebts,
      snapshot.overpaymentCredits,
      snapshot.payments,
      snapshot.settlementLines,
      snapshot.sharedExpenses,
    ],
  );
  const memberBalances = useMemo(() => calculateMemberBalances(ledgerEntries), [ledgerEntries]);
  const personalTotals = useMemo(() => calculatePersonalTotals(ledgerEntries), [ledgerEntries]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...snapshot,
      ready: Boolean(repository) && !loading,
      loading,
      error,
      ledgerEntries,
      memberBalances,
      personalTotals,
      refresh,
      resetLocalData: async (seed = true) => {
        await runAndRefresh((repo) => repo.reset(seed));
      },
      upsertProfile: (profile) => runAndRefresh((repo) => repo.upsertProfile(profile)),
      upsertLinkRequest: (linkRequest) => runAndRefresh((repo) => repo.upsertLinkRequest(linkRequest)),
      upsertDebtVerification: (verification) => runAndRefresh((repo) => repo.upsertDebtVerification(verification)),
      upsertDebt: (debt) => runAndRefresh((repo) => repo.upsertDebt(debt)),
      upsertSharedExpense: (expense) => runAndRefresh((repo) => repo.upsertSharedExpense(expense)),
      upsertEvent: (event) => runAndRefresh((repo) => repo.upsertEvent(event)),
      upsertEventParticipant: (participant) => runAndRefresh((repo) => repo.upsertEventParticipant(participant)),
      upsertEventInvite: (invite) => runAndRefresh((repo) => repo.upsertEventInvite(invite)),
      upsertSharedEventMember: (member) => runAndRefresh((repo) => repo.upsertSharedEventMember(member)),
      upsertEventMemberClaim: (claim) => runAndRefresh((repo) => repo.upsertEventMemberClaim(claim)),
      upsertEventDuplicateWarning: (warning) => runAndRefresh((repo) => repo.upsertEventDuplicateWarning(warning)),
      upsertEventDebt: (debt) => runAndRefresh((repo) => repo.upsertEventDebt(debt)),
      upsertEventVerificationResponse: (response) =>
        runAndRefresh((repo) => repo.upsertEventVerificationResponse(response)),
      upsertEventActivityLog: (activity) => runAndRefresh((repo) => repo.upsertEventActivityLog(activity)),
      upsertPayment: (payment) => runAndRefresh((repo) => repo.upsertPayment(payment)),
      upsertSettlement: (settlement) => runAndRefresh((repo) => repo.upsertSettlement(settlement)),
      upsertSettlementLine: (line) => runAndRefresh((repo) => repo.upsertSettlementLine(line)),
      createMember: (input) => runAndRefresh((repo) => repo.createMember(input)),
      updateMember: (memberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.updateMember(member, input);
        }),
      sendMemberLinkRequest: (memberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.sendMemberLinkRequest({ member, ...input });
        }),
      respondToLinkRequest: (requestId, status, actorUserId) =>
        runAndRefresh((repo) => {
          const linkRequest = snapshot.linkRequests.find((item) => item.id === requestId);
          if (!linkRequest) {
            throw new Error('Link request not found.');
          }
          return repo.respondToLinkRequest(linkRequest, status, actorUserId);
        }),
      unlinkMember: (memberId, actorUserId = null) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.unlinkMember(member, actorUserId);
        }),
      createDebt: (input) => runAndRefresh((repo) => repo.createDebt(input)),
      updateDebt: (debtId, input) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.updateDebt(debt, input);
        }),
      requestDebtVerification: (debtId, input) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          const member = snapshot.members.find((item) => item.id === debt.memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.requestDebtVerification({ debt, member, ...input });
        }),
      respondToDebtVerification: (verificationId, status, actorUserId, rejectionReason, suggestedChange) =>
        runAndRefresh((repo) => {
          const verification = snapshot.debtVerifications.find((item) => item.id === verificationId);
          if (!verification) {
            throw new Error('Verification request not found.');
          }
          const debt = snapshot.debts.find((item) => item.id === verification.debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.respondToDebtVerification(verification, debt, status, actorUserId, rejectionReason, suggestedChange);
        }),
      markDebtDisputed: (debtId, actorUserId = null, disputeReason = null) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.markDebtDisputed(debt, actorUserId, disputeReason);
        }),
      markDebtResolved: (debtId, actorUserId = null, resolutionNote = null) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.markDebtResolved(debt, actorUserId, resolutionNote);
        }),
      cancelDebtVerification: (debtId, actorUserId = null) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          const verification = debt.verificationRequestId
            ? snapshot.debtVerifications.find((item) => item.id === debt.verificationRequestId)
            : undefined;
          return repo.cancelDebtVerification(debt, verification, actorUserId);
        }),
      createEvent: (input) => runAndRefresh((repo) => repo.createEvent(input)),
      updateEvent: (eventId, input) =>
        runAndRefresh((repo) => {
          const event = snapshot.events.find((item) => item.id === eventId);
          if (!event) {
            throw new Error('Event not found.');
          }
          return repo.updateEvent(event, input);
        }),
      setEventMembers: async (eventId, memberIds) => {
        await runAndRefresh((repo) => repo.setEventMembers(eventId, memberIds));
      },
      createSharedExpense: (input) => runAndRefresh((repo) => repo.createSharedExpense(input)),
      updateSharedExpense: (expenseId, input) =>
        runAndRefresh((repo) => {
          const expense = snapshot.sharedExpenses.find((item) => item.id === expenseId);
          if (!expense) {
            throw new Error('Expense not found.');
          }
          return repo.updateSharedExpense(expense, input);
        }),
      createEventInvite: (input) => runAndRefresh((repo) => repo.createEventInvite(input)),
      respondToEventInvite: (inviteId, status, actorUserId, actorDisplayName, actorEmail) =>
        runAndRefresh((repo) => {
          const invite = snapshot.eventInvites.find((item) => item.id === inviteId);
          if (!invite) {
            throw new Error('Event invite not found.');
          }
          return repo.respondToEventInvite(invite, status, actorUserId, actorDisplayName, actorEmail);
        }),
      createSharedEventMember: (input) => runAndRefresh((repo) => repo.createSharedEventMember(input)),
      updateSharedEventMember: (eventMemberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.sharedEventMembers.find((item) => item.id === eventMemberId);
          if (!member) {
            throw new Error('Event member not found.');
          }
          return repo.updateSharedEventMember(member, input);
        }),
      createEventMemberClaim: (eventMemberId, claimantUserId, message, remoteId) =>
        runAndRefresh((repo) => {
          const member = snapshot.sharedEventMembers.find((item) => item.id === eventMemberId);
          if (!member) {
            throw new Error('Event member not found.');
          }
          return repo.createEventMemberClaim(member, claimantUserId, message, remoteId);
        }),
      respondToEventMemberClaim: (claimId, status, actorUserId) =>
        runAndRefresh((repo) => {
          const claim = snapshot.eventMemberClaims.find((item) => item.id === claimId);
          if (!claim) {
            throw new Error('Claim request not found.');
          }
          const member = snapshot.sharedEventMembers.find((item) => item.id === claim.eventMemberId);
          if (!member) {
            throw new Error('Event member not found.');
          }
          return repo.respondToEventMemberClaim(claim, member, status, actorUserId);
        }),
      ignoreEventDuplicateWarning: (warningId, actorUserId) =>
        runAndRefresh((repo) => {
          const warning = snapshot.eventDuplicateWarnings.find((item) => item.id === warningId);
          if (!warning) {
            throw new Error('Duplicate warning not found.');
          }
          return repo.ignoreEventDuplicateWarning(warning, actorUserId);
        }),
      mergeSharedEventMembers: (sourceEventMemberId, targetEventMemberId, actorUserId) =>
        runAndRefresh((repo) => {
          const source = snapshot.sharedEventMembers.find((item) => item.id === sourceEventMemberId);
          const target = snapshot.sharedEventMembers.find((item) => item.id === targetEventMemberId);
          if (!source || !target) {
            throw new Error('Event member not found.');
          }
          return repo.mergeSharedEventMembers(source, target, actorUserId);
        }),
      createEventDebt: (input) => runAndRefresh((repo) => repo.createEventDebt(input)),
      updateEventDebt: (eventDebtId, input) =>
        runAndRefresh((repo) => {
          const debt = snapshot.eventDebts.find((item) => item.id === eventDebtId);
          if (!debt) {
            throw new Error('Event debt not found.');
          }
          return repo.updateEventDebt(debt, input);
        }),
      createPaymentSettlement: (input) => runAndRefresh((repo) => repo.createPaymentSettlement(input)),
      createRecurringTemplate: (input) => runAndRefresh((repo) => repo.createRecurringTemplate(input)),
      updateRecurringTemplate: (templateId, input) =>
        runAndRefresh((repo) => {
          const template = snapshot.recurringTemplates.find((item) => item.id === templateId);
          if (!template) {
            throw new Error('Recurring template not found.');
          }
          return repo.updateRecurringTemplate(template, input);
        }),
      generateDueRecurringRecords: () => runAndRefresh((repo) => repo.generateDueRecurringRecords()),
      createReminder: (input) => runAndRefresh((repo) => repo.createReminder(input)),
      createSoftReminder: (input) => runAndRefresh((repo) => repo.createSoftReminder(input)),
      createAttachment: (input) => runAndRefresh((repo) => repo.createAttachment(input)),
      upsertAttachment: (attachment) => runAndRefresh((repo) => repo.upsertAttachment(attachment)),
      archiveAttachment: (attachmentId, actorUserId = null) =>
        runAndRefresh((repo) => {
          const attachment = snapshot.attachments.find((item) => item.id === attachmentId);
          if (!attachment) {
            throw new Error('Attachment not found.');
          }
          return repo.archiveAttachment(attachment, actorUserId);
        }),
      createComment: (input) => runAndRefresh((repo) => repo.createComment(input)),
      updateComment: (commentId, input) =>
        runAndRefresh((repo) => {
          const comment = snapshot.comments.find((item) => item.id === commentId);
          if (!comment) {
            throw new Error('Comment not found.');
          }
          return repo.updateComment(comment, input);
        }),
      deleteComment: (commentId, actorUserId = null) =>
        runAndRefresh((repo) => {
          const comment = snapshot.comments.find((item) => item.id === commentId);
          if (!comment) {
            throw new Error('Comment not found.');
          }
          return repo.deleteComment(comment, actorUserId);
        }),
      upsertSmartSuggestion: (input) => runAndRefresh((repo) => repo.upsertSmartSuggestion(input)),
      setSmartSuggestionStatus: (suggestionId, status) =>
        runAndRefresh((repo) => {
          const suggestion = snapshot.smartSuggestions.find((item) => item.id === suggestionId);
          if (!suggestion) {
            throw new Error('Smart suggestion not found.');
          }
          return repo.setSmartSuggestionStatus(suggestion, status);
        }),
      createExportLog: (input) => runAndRefresh((repo) => repo.createExportLog(input)),
      createCsvImportBatch: (input) => runAndRefresh((repo) => repo.createCsvImportBatch(input)),
      respondToEventVerification: (input) => runAndRefresh((repo) => repo.respondToEventVerification(input)),
      updateSettings: async (settings) => {
        await runAndRefresh((repo) => repo.updateSettings(settings));
      },
      updateRate: async (currency, rateToSek) => {
        await runAndRefresh((repo) => repo.updateRate(currency, rateToSek));
      },
    }),
    [
      error,
      ledgerEntries,
      loading,
      memberBalances,
      personalTotals,
      refresh,
      repository,
      runAndRefresh,
      snapshot,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

function withBootTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return value;
}
