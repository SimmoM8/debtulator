import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  type DatabaseSnapshot,
  loadSnapshot,
  openDebtulatorDatabase,
} from '@/src/data/database';
import { DebtulatorRepository } from '@/src/data/repositories';
import type { RestoreResult } from '@/src/services/backupRestore';
import { buildSyncSummary } from '@/src/services/stage6Sync';
import { buildLedgerEntries, calculateMemberBalances, calculatePersonalTotals } from '@/src/services/ledger';
import { addTelemetryBreadcrumb, captureTelemetryException, trackTelemetryEvent } from '@/src/services/telemetry';
import type {
  AppSettings,
  AccountDeletionState,
  BackupMode,
  AppNotification,
  Attachment,
  AttachmentKind,
  AttachmentTargetType,
  AttachmentVisibility,
  AuditLog,
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
  GroupMemberClaim,
  GroupParticipant,
  GroupRole,
  GroupStatus,
  GroupVerificationResponse,
  ExportLog,
  ExportType,
  ConflictResolution,
  LedgerEntry,
  LinkRequest,
  Member,
  MoneyMap,
  Payment,
  ParticipantId,
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
  SyncConflict,
  SyncQueueEntry,
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
  groupId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: Debt['visibility'];
};

type CreateGroupInput = {
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

type CreateExpenseInput = {
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

type CreateGroupInviteInput = {
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

type CreateSharedGroupMemberInput = {
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

type CreateGroupDebtInput = {
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

type CreatePaymentSettlementInput = {
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

type CreateAttachmentInput = {
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

type CreateCommentInput = {
  targetType: CommentTargetType;
  targetId: string;
  groupId?: string | null;
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
  syncSummary: ReturnType<typeof buildSyncSummary>;
  refresh: () => Promise<void>;
  retryBoot: () => void;
  resetLocalData: (seed?: boolean) => Promise<void>;
  upsertProfile: (profile: UserProfile) => Promise<UserProfile>;
  upsertLinkRequest: (linkRequest: LinkRequest) => Promise<LinkRequest>;
  upsertDebtVerification: (verification: DebtVerification) => Promise<DebtVerification>;
  upsertDebt: (debt: Debt) => Promise<Debt>;
  upsertSharedExpense: (expense: SharedExpense) => Promise<SharedExpense>;
  upsertGroup: (group: Group) => Promise<Group>;
  upsertGroupParticipant: (participant: GroupParticipant) => Promise<GroupParticipant>;
  upsertGroupInvite: (invite: GroupInvite) => Promise<GroupInvite>;
  upsertSharedGroupMember: (member: SharedGroupMember) => Promise<SharedGroupMember>;
  upsertGroupMemberClaim: (claim: GroupMemberClaim) => Promise<GroupMemberClaim>;
  upsertGroupDuplicateWarning: (warning: GroupDuplicateWarning) => Promise<GroupDuplicateWarning>;
  upsertGroupDebt: (debt: GroupDebt) => Promise<GroupDebt>;
  upsertGroupVerificationResponse: (response: GroupVerificationResponse) => Promise<GroupVerificationResponse>;
  upsertGroupActivityLog: (activity: GroupActivityLog) => Promise<GroupActivityLog>;
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
  updateDebt: (
    debtId: string,
    input: Partial<CreateDebtInput>,
    actorUserId?: string | null,
  ) => Promise<Debt>;
  requestDebtVerification: (
    debtId: string,
    input: {
      requesterUserId: string;
      responderUserId: string;
      remoteDebtId?: string | null;
      remoteVerificationId?: string | null;
      sharedNotes?: string | null;
      requestType?: DebtVerificationRequestType;
      changeSummary?: DebtChangeSummary | null;
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
  createGroup: (input: CreateGroupInput) => Promise<Group>;
  updateGroup: (
    groupId: string,
    input: Partial<CreateGroupInput> & { archived?: boolean; ignoredDuplicateKeys?: string[] },
  ) => Promise<Group>;
  setGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>;
  createSharedExpense: (input: CreateExpenseInput) => Promise<SharedExpense>;
  updateSharedExpense: (expenseId: string, input: Partial<CreateExpenseInput>) => Promise<SharedExpense>;
  createGroupInvite: (input: CreateGroupInviteInput) => Promise<GroupInvite>;
  respondToGroupInvite: (
    inviteId: string,
    status: Extract<GroupInvite['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
    actorDisplayName?: string | null,
    actorEmail?: string | null,
  ) => Promise<GroupInvite>;
  createSharedGroupMember: (input: CreateSharedGroupMemberInput) => Promise<SharedGroupMember>;
  updateSharedGroupMember: (
    groupMemberId: string,
    input: Partial<CreateSharedGroupMemberInput> & { archived?: boolean },
  ) => Promise<SharedGroupMember>;
  createGroupMemberClaim: (
    groupMemberId: string,
    claimantUserId: string,
    message?: string | null,
    remoteId?: string | null,
  ) => Promise<GroupMemberClaim>;
  respondToGroupMemberClaim: (
    claimId: string,
    status: Extract<GroupMemberClaim['status'], 'approved' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) => Promise<GroupMemberClaim>;
  ignoreGroupDuplicateWarning: (warningId: string, actorUserId: string) => Promise<GroupDuplicateWarning>;
  mergeSharedGroupMembers: (
    sourceGroupMemberId: string,
    targetGroupMemberId: string,
    actorUserId: string,
  ) => Promise<{ sourceId: string; targetId: string }>;
  createGroupDebt: (input: CreateGroupDebtInput) => Promise<GroupDebt>;
  updateGroupDebt: (groupDebtId: string, input: Partial<CreateGroupDebtInput>) => Promise<GroupDebt>;
  createPaymentSettlement: (input: CreatePaymentSettlementInput) => Promise<{
    payment: Payment;
    settlement: Settlement;
    lines: SettlementLine[];
  }>;
  respondToPaymentConfirmation: (
    paymentId: string,
    status: Extract<Payment['confirmationStatus'], 'confirmed' | 'rejected'>,
    actorUserId: string,
  ) => Promise<Payment>;
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
  upsertComment: (comment: Comment) => Promise<Comment>;
  createComment: (input: CreateCommentInput) => Promise<Comment>;
  updateComment: (commentId: string, input: Partial<CreateCommentInput>) => Promise<Comment>;
  deleteComment: (commentId: string, actorUserId?: string | null) => Promise<Comment>;
  upsertSmartSuggestion: (input: SmartSuggestion | CreateSmartSuggestionInput) => Promise<SmartSuggestion>;
  setSmartSuggestionStatus: (suggestionId: string, status: SmartSuggestionStatus) => Promise<SmartSuggestion>;
  createExportLog: (input: CreateExportLogInput) => Promise<ExportLog>;
  createCsvImportBatch: (input: CreateCsvImportBatchInput) => Promise<CsvImportBatch>;
  upsertSyncQueueEntry: (entry: SyncQueueEntry) => Promise<SyncQueueEntry>;
  queueSyncOperation: (input: {
    entityType: SyncQueueEntry['entityType'];
    entityId: string;
    operation: SyncQueueEntry['operation'];
    payload?: Record<string, unknown>;
    dependencyIds?: string[];
  }) => Promise<SyncQueueEntry>;
  updateSyncQueueEntry: (entryId: string, patch: Partial<SyncQueueEntry>) => Promise<SyncQueueEntry>;
  upsertSyncConflict: (conflict: SyncConflict) => Promise<SyncConflict>;
  resolveSyncConflict: (
    conflictId: string,
    resolution: ConflictResolution,
    actorUserId?: string | null,
  ) => Promise<SyncConflict>;
  createNotification: (input: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'> & { readAt?: string | null }) => Promise<AppNotification>;
  markNotificationRead: (notificationId: string) => Promise<AppNotification>;
  markAllNotificationsRead: () => Promise<void>;
  createAuditLog: (input: Omit<AuditLog, 'id' | 'createdAt' | 'deviceId'> & { deviceId?: string | null }) => Promise<AuditLog>;
  submitAccountDeletionRequest: (input: {
    userId: string;
    deleteLocalData: boolean;
    keepLocalArchive: boolean;
  }) => Promise<AccountDeletionState>;
  restoreBackup: (rawJson: string, mode: BackupMode) => Promise<RestoreResult>;
  respondToGroupVerification: (input: {
    groupId: string;
    targetType: GroupVerificationResponse['targetType'];
    targetId: string;
    groupMemberId: string;
    linkedUserId: string;
    status: Extract<VerificationStatus, 'verified' | 'rejected'>;
    rejectionReason?: string | null;
  }) => Promise<GroupVerificationResponse>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateRate: (currency: CurrencyCode, rateToSek: number) => Promise<void>;
};

const emptySnapshot: DatabaseSnapshot = {
  profiles: [],
  members: [],
  debts: [],
  groups: [],
  groupMembers: [],
  groupParticipants: [],
  groupInvites: [],
  sharedGroupMembers: [],
  groupMemberClaims: [],
  groupDuplicateWarnings: [],
  sharedExpenses: [],
  groupDebts: [],
  payments: [],
  settlements: [],
  settlementLines: [],
  expensePayers: [],
  recurringTemplates: [],
  reminders: [],
  softReminders: [],
  overpaymentCredits: [],
  groupVerificationResponses: [],
  groupActivityLogs: [],
  linkRequests: [],
  debtVerifications: [],
  activityLogs: [],
  attachments: [],
  comments: [],
  smartSuggestions: [],
  exportLogs: [],
  csvImportBatches: [],
  syncQueue: [],
  syncConflicts: [],
  notifications: [],
  auditLogs: [],
  tags: [],
  currencyRates: [],
  settings: {
    baseCurrency: 'SEK',
    hasCompletedFirstRun: false,
    localDisplayName: null,
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
    defaultDebtVisibility: 'private',
    defaultGroupVisibility: 'private',
    showSensitiveDetailsInNotifications: false,
    syncPrivateLocalDataToAccountBackup: false,
    uploadAttachmentsForSharedRecords: false,
    analyticsIncludeRejectedDisputed: false,
    smartSuggestionsPrivateOnly: true,
    pushNotificationsEnabled: false,
    emailNotificationsEnabled: false,
    notificationVerificationEnabled: true,
    notificationGroupEnabled: true,
    notificationPaymentSettlementEnabled: true,
    notificationReminderEnabled: true,
    notificationCommentEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    language: 'system',
    backupIncludeAttachments: false,
    backupIncludePrivateNotes: false,
    betaTelemetryEnabled: true,
    betaCrashReportingEnabled: true,
    lastBackupAt: null,
  },
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot>(emptySnapshot);
  const [repository, setRepository] = useState<DebtulatorRepository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        setLoading(true);
        setError(null);
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
          setRepository(null);
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
  }, [bootAttempt]);

  const retryBoot = useCallback(() => {
    setBootAttempt((attempt) => attempt + 1);
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
        snapshot.groupDebts,
        snapshot.settlementLines,
        snapshot.payments,
        snapshot.overpaymentCredits,
      ),
    [
      snapshot.debts,
      snapshot.groupDebts,
      snapshot.overpaymentCredits,
      snapshot.payments,
      snapshot.settlementLines,
      snapshot.sharedExpenses,
    ],
  );
  const memberBalances = useMemo(() => calculateMemberBalances(ledgerEntries), [ledgerEntries]);
  const personalTotals = useMemo(() => calculatePersonalTotals(ledgerEntries), [ledgerEntries]);
  const syncSummary = useMemo(() => buildSyncSummary(snapshot), [snapshot]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...snapshot,
      ready: Boolean(repository) && !loading,
      loading,
      error,
      ledgerEntries,
      memberBalances,
      personalTotals,
      syncSummary,
      refresh,
      retryBoot,
      resetLocalData: async (seed = true) => {
        await runAndRefresh((repo) => repo.reset(seed));
      },
      upsertProfile: (profile) => runAndRefresh((repo) => repo.upsertProfile(profile)),
      upsertLinkRequest: (linkRequest) => runAndRefresh((repo) => repo.upsertLinkRequest(linkRequest)),
      upsertDebtVerification: (verification) => runAndRefresh((repo) => repo.upsertDebtVerification(verification)),
      upsertDebt: (debt) => runAndRefresh((repo) => repo.upsertDebt(debt)),
      upsertSharedExpense: (expense) => runAndRefresh((repo) => repo.upsertSharedExpense(expense)),
      upsertGroup: (group) => runAndRefresh((repo) => repo.upsertGroup(group)),
      upsertGroupParticipant: (participant) => runAndRefresh((repo) => repo.upsertGroupParticipant(participant)),
      upsertGroupInvite: (invite) => runAndRefresh((repo) => repo.upsertGroupInvite(invite)),
      upsertSharedGroupMember: (member) => runAndRefresh((repo) => repo.upsertSharedGroupMember(member)),
      upsertGroupMemberClaim: (claim) => runAndRefresh((repo) => repo.upsertGroupMemberClaim(claim)),
      upsertGroupDuplicateWarning: (warning) => runAndRefresh((repo) => repo.upsertGroupDuplicateWarning(warning)),
      upsertGroupDebt: (debt) => runAndRefresh((repo) => repo.upsertGroupDebt(debt)),
      upsertGroupVerificationResponse: (response) =>
        runAndRefresh((repo) => repo.upsertGroupVerificationResponse(response)),
      upsertGroupActivityLog: (activity) => runAndRefresh((repo) => repo.upsertGroupActivityLog(activity)),
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
      updateDebt: (debtId, input, actorUserId = null) =>
        runAndRefresh(async (repo) => {
          const latest = await repo.load();
          const debt = latest.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.updateDebt(debt, input, actorUserId);
        }),
      requestDebtVerification: (debtId, input) =>
        runAndRefresh(async (repo) => {
          const latest = await repo.load();
          const debt = latest.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          const member = latest.members.find((item) => item.id === debt.memberId);
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
      createGroup: (input) => runAndRefresh((repo) => repo.createGroup(input)),
      updateGroup: (groupId, input) =>
        runAndRefresh((repo) => {
          const group = snapshot.groups.find((item) => item.id === groupId);
          if (!group) {
            throw new Error('Group not found.');
          }
          return repo.updateGroup(group, input);
        }),
      setGroupMembers: async (groupId, memberIds) => {
        await runAndRefresh((repo) => repo.setGroupMembers(groupId, memberIds));
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
      createGroupInvite: (input) => runAndRefresh((repo) => repo.createGroupInvite(input)),
      respondToGroupInvite: (inviteId, status, actorUserId, actorDisplayName, actorEmail) =>
        runAndRefresh((repo) => {
          const invite = snapshot.groupInvites.find((item) => item.id === inviteId);
          if (!invite) {
            throw new Error('Group invite not found.');
          }
          return repo.respondToGroupInvite(invite, status, actorUserId, actorDisplayName, actorEmail);
        }),
      createSharedGroupMember: (input) => runAndRefresh((repo) => repo.createSharedGroupMember(input)),
      updateSharedGroupMember: (groupMemberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.sharedGroupMembers.find((item) => item.id === groupMemberId);
          if (!member) {
            throw new Error('Group member not found.');
          }
          return repo.updateSharedGroupMember(member, input);
        }),
      createGroupMemberClaim: (groupMemberId, claimantUserId, message, remoteId) =>
        runAndRefresh((repo) => {
          const member = snapshot.sharedGroupMembers.find((item) => item.id === groupMemberId);
          if (!member) {
            throw new Error('Group member not found.');
          }
          return repo.createGroupMemberClaim(member, claimantUserId, message, remoteId);
        }),
      respondToGroupMemberClaim: (claimId, status, actorUserId) =>
        runAndRefresh((repo) => {
          const claim = snapshot.groupMemberClaims.find((item) => item.id === claimId);
          if (!claim) {
            throw new Error('Claim request not found.');
          }
          const member = snapshot.sharedGroupMembers.find((item) => item.id === claim.groupMemberId);
          if (!member) {
            throw new Error('Group member not found.');
          }
          return repo.respondToGroupMemberClaim(claim, member, status, actorUserId);
        }),
      ignoreGroupDuplicateWarning: (warningId, actorUserId) =>
        runAndRefresh((repo) => {
          const warning = snapshot.groupDuplicateWarnings.find((item) => item.id === warningId);
          if (!warning) {
            throw new Error('Duplicate warning not found.');
          }
          return repo.ignoreGroupDuplicateWarning(warning, actorUserId);
        }),
      mergeSharedGroupMembers: (sourceGroupMemberId, targetGroupMemberId, actorUserId) =>
        runAndRefresh((repo) => {
          const source = snapshot.sharedGroupMembers.find((item) => item.id === sourceGroupMemberId);
          const target = snapshot.sharedGroupMembers.find((item) => item.id === targetGroupMemberId);
          if (!source || !target) {
            throw new Error('Group member not found.');
          }
          return repo.mergeSharedGroupMembers(source, target, actorUserId);
        }),
      createGroupDebt: (input) => runAndRefresh((repo) => repo.createGroupDebt(input)),
      updateGroupDebt: (groupDebtId, input) =>
        runAndRefresh((repo) => {
          const debt = snapshot.groupDebts.find((item) => item.id === groupDebtId);
          if (!debt) {
            throw new Error('Group debt not found.');
          }
          return repo.updateGroupDebt(debt, input);
        }),
      createPaymentSettlement: (input) => runAndRefresh((repo) => repo.createPaymentSettlement(input)),
      respondToPaymentConfirmation: (paymentId, status, actorUserId) =>
        runAndRefresh(async (repo) => {
          const latest = await repo.load();
          const payment = latest.payments.find((item) => item.id === paymentId);
          if (!payment) {
            throw new Error('Payment not found.');
          }
          return repo.respondToPaymentConfirmation(payment, status, actorUserId);
        }),
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
      upsertComment: (comment) => runAndRefresh((repo) => repo.upsertComment(comment)),
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
      upsertSyncQueueEntry: (entry) => runAndRefresh((repo) => repo.upsertSyncQueueEntry(entry)),
      queueSyncOperation: (input) => runAndRefresh((repo) => repo.queueSyncOperation(input)),
      updateSyncQueueEntry: (entryId, patch) =>
        runAndRefresh((repo) => {
          const entry = snapshot.syncQueue.find((item) => item.id === entryId);
          if (!entry) {
            throw new Error('Sync queue item not found.');
          }
          return repo.markSyncQueueEntry(entry, patch);
        }),
      upsertSyncConflict: (conflict) => runAndRefresh((repo) => repo.upsertSyncConflict(conflict)),
      resolveSyncConflict: async (conflictId, resolution, actorUserId = null) => {
        addTelemetryBreadcrumb('conflict', 'resolution_started', { resolution });
        try {
          const result = await runAndRefresh((repo) => {
            const conflict = snapshot.syncConflicts.find((item) => item.id === conflictId);
            if (!conflict) {
              throw new Error('Sync conflict not found.');
            }
            return repo.resolveSyncConflict(conflict, resolution, actorUserId);
          });
          addTelemetryBreadcrumb('conflict', 'resolution_completed', { resolution, result: 'success' });
          trackTelemetryEvent('conflict_resolution_completed', { resolution, result: 'success' });
          return result;
        } catch (error) {
          addTelemetryBreadcrumb('conflict', 'resolution_failed', { resolution, result: 'failure' });
          captureTelemetryException(error, 'conflict_resolution', { resolution });
          throw error;
        }
      },
      createNotification: (input) => runAndRefresh((repo) => repo.createNotification(input)),
      markNotificationRead: (notificationId) =>
        runAndRefresh((repo) => {
          const notification = snapshot.notifications.find((item) => item.id === notificationId);
          if (!notification) {
            throw new Error('Notification not found.');
          }
          return repo.markNotificationRead(notification);
        }),
      markAllNotificationsRead: async () => {
        await runAndRefresh(async (repo) => {
          for (const notification of snapshot.notifications.filter((item) => !item.readAt)) {
            await repo.markNotificationRead(notification);
          }
        });
      },
      createAuditLog: (input) => runAndRefresh((repo) => repo.createAuditLog(input)),
      restoreBackup: (rawJson, mode) => runAndRefresh((repo) => repo.restoreBackup(rawJson, mode)),
      submitAccountDeletionRequest: (input) => runAndRefresh((repo) => repo.submitAccountDeletionRequest(input)),
      respondToGroupVerification: (input) => runAndRefresh((repo) => repo.respondToGroupVerification(input)),
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
      retryBoot,
      repository,
      runAndRefresh,
      snapshot,
      syncSummary,
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
