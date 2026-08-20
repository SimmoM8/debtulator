import type { RestoreResult } from '../data/backupRestore';
import type { AppSnapshot } from '../model/AppSnapshot';
import type {
  AccountDeletionState,
  AppNotification,
  AppSettings,
  Attachment,
  AuditLog,
  BackupMode,
  Comment,
  ConflictResolution,
  CurrencyCode,
  CsvImportBatch,
  Debt,
  DebtChangeSummary,
  DebtVerification,
  DebtVerificationRequestType,
  ExportLog,
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
  Payment,
  RecurringTemplate,
  Reminder,
  Settlement,
  SettlementLine,
  SharedExpense,
  SharedGroupMember,
  SmartSuggestion,
  SmartSuggestionStatus,
  SoftReminder,
  SuggestedDebtChange,
  SyncConflict,
  SyncQueueEntry,
  UserProfile,
  VerificationStatus,
} from '@debtulator/domain/models';
import type {
  CreateAttachmentInput,
  CreateCommentInput,
  CreateCsvImportBatchInput,
  CreateDebtInput,
  CreateExpenseInput,
  CreateExportLogInput,
  CreateGroupDebtInput,
  CreateGroupInput,
  CreateGroupInviteInput,
  CreateMemberInput,
  CreateNotificationInput,
  CreatePaymentSettlementInput,
  CreateRecurringTemplateInput,
  CreateReminderInput,
  CreateSharedGroupMemberInput,
  CreateSmartSuggestionInput,
  CreateSoftReminderInput,
  QueueSyncOperationInput,
} from './LocalLedgerTypes';
import type {
  SnapshotUnitOfWork,
  TransactionalSnapshotPort,
} from '../state/SnapshotCoordinator';

export type RemoteDebtCounterproposal = {
  id: string;
  debt_id: string;
  requester_user_id: string;
  responder_user_id: string;
  requested_at: string;
  created_at: string;
  updated_at: string;
};

export interface MemberLedgerUnitOfWork {
  createMember(input: CreateMemberInput): Promise<Member>;
  updateMember(
    member: Member,
    input: Partial<CreateMemberInput> & { archived?: boolean },
  ): Promise<Member>;
  sendMemberLinkRequest(input: {
    member: Member;
    requesterUserId: string;
    requesterDisplayName?: string | null;
    targetUserId?: string | null;
    targetEmail?: string | null;
    targetPhone?: string | null;
    message?: string | null;
    remoteId?: string | null;
  }): Promise<LinkRequest>;
  respondToLinkRequest(
    request: LinkRequest,
    status: Extract<LinkRequest['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ): Promise<LinkRequest>;
  unlinkMember(member: Member, actorUserId: string | null): Promise<Member>;
  upsertProfile(profile: UserProfile): Promise<UserProfile>;
  upsertLinkRequest(request: LinkRequest): Promise<LinkRequest>;
}

export interface DebtLedgerUnitOfWork {
  createDebt(input: CreateDebtInput): Promise<Debt>;
  updateDebt(
    debt: Debt,
    input: Partial<CreateDebtInput>,
    actorUserId?: string | null,
  ): Promise<Debt>;
  requestDebtVerification(input: {
    debt: Debt;
    member: Member;
    requesterUserId: string;
    responderUserId: string;
    remoteDebtId?: string | null;
    remoteVerificationId?: string | null;
    sharedNotes?: string | null;
    requestType?: DebtVerificationRequestType;
    changeSummary?: DebtChangeSummary | null;
  }): Promise<{ debt: Debt; verification: DebtVerification }>;
  respondToDebtVerification(
    verification: DebtVerification,
    debt: Debt,
    status: Extract<VerificationStatus, 'verified' | 'rejected'>,
    actorUserId: string,
    rejectionReason?: string | null,
    suggestedChange?: SuggestedDebtChange | null,
  ): Promise<{ debt: Debt; verification: DebtVerification }>;
  counterDebtVerification(
    verification: DebtVerification,
    debt: Debt,
    actorUserId: string,
    changeSummary: DebtChangeSummary,
    remoteCounterproposal: RemoteDebtCounterproposal | null,
  ): Promise<{ debt: Debt; verification: DebtVerification }>;
  markDebtDisputed(
    debt: Debt,
    actorUserId: string | null,
    disputeReason?: string | null,
  ): Promise<Debt>;
  markDebtResolved(
    debt: Debt,
    actorUserId: string | null,
    resolutionNote?: string | null,
  ): Promise<Debt>;
  cancelDebtVerification(
    debt: Debt,
    verification: DebtVerification | undefined,
    actorUserId: string | null,
  ): Promise<Debt>;
  upsertDebtVerification(verification: DebtVerification): Promise<DebtVerification>;
  upsertDebt(debt: Debt): Promise<Debt>;
}

export interface GroupLedgerUnitOfWork {
  createGroup(input: CreateGroupInput): Promise<Group>;
  updateGroup(
    group: Group,
    input: Partial<CreateGroupInput> & {
      archived?: boolean;
      ignoredDuplicateKeys?: string[];
    },
  ): Promise<Group>;
  setGroupMembers(groupId: string, memberIds: string[]): Promise<void>;
  createSharedExpense(input: CreateExpenseInput): Promise<SharedExpense>;
  updateSharedExpense(
    expense: SharedExpense,
    input: Partial<CreateExpenseInput>,
  ): Promise<SharedExpense>;
  createGroupInvite(input: CreateGroupInviteInput): Promise<GroupInvite>;
  respondToGroupInvite(
    invite: GroupInvite,
    status: Extract<GroupInvite['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
    actorDisplayName?: string | null,
    actorEmail?: string | null,
  ): Promise<GroupInvite>;
  createSharedGroupMember(
    input: CreateSharedGroupMemberInput,
  ): Promise<SharedGroupMember>;
  updateSharedGroupMember(
    member: SharedGroupMember,
    input: Partial<CreateSharedGroupMemberInput> & { archived?: boolean },
  ): Promise<SharedGroupMember>;
  createGroupMemberClaim(
    member: SharedGroupMember,
    claimantUserId: string,
    message?: string | null,
    remoteId?: string | null,
  ): Promise<GroupMemberClaim>;
  respondToGroupMemberClaim(
    claim: GroupMemberClaim,
    member: SharedGroupMember,
    status: Extract<
      GroupMemberClaim['status'],
      'approved' | 'rejected' | 'cancelled'
    >,
    actorUserId: string,
  ): Promise<GroupMemberClaim>;
  ignoreGroupDuplicateWarning(
    warning: GroupDuplicateWarning,
    actorUserId: string,
  ): Promise<GroupDuplicateWarning>;
  mergeSharedGroupMembers(
    source: SharedGroupMember,
    target: SharedGroupMember,
    actorUserId: string,
  ): Promise<{ sourceId: string; targetId: string }>;
  createGroupDebt(input: CreateGroupDebtInput): Promise<GroupDebt>;
  updateGroupDebt(
    debt: GroupDebt,
    input: Partial<CreateGroupDebtInput>,
  ): Promise<GroupDebt>;
  respondToGroupVerification(input: {
    groupId: string;
    targetType: GroupVerificationResponse['targetType'];
    targetId: string;
    groupMemberId: string;
    linkedUserId: string;
    status: Extract<VerificationStatus, 'verified' | 'rejected'>;
    rejectionReason?: string | null;
  }): Promise<GroupVerificationResponse>;
  upsertSharedExpense(expense: SharedExpense): Promise<SharedExpense>;
  upsertGroup(group: Group): Promise<Group>;
  upsertGroupParticipant(participant: GroupParticipant): Promise<GroupParticipant>;
  upsertGroupInvite(invite: GroupInvite): Promise<GroupInvite>;
  upsertSharedGroupMember(member: SharedGroupMember): Promise<SharedGroupMember>;
  upsertGroupMemberClaim(claim: GroupMemberClaim): Promise<GroupMemberClaim>;
  upsertGroupDuplicateWarning(
    warning: GroupDuplicateWarning,
  ): Promise<GroupDuplicateWarning>;
  upsertGroupDebt(debt: GroupDebt): Promise<GroupDebt>;
  upsertGroupVerificationResponse(
    response: GroupVerificationResponse,
  ): Promise<GroupVerificationResponse>;
  upsertGroupActivityLog(activity: GroupActivityLog): Promise<GroupActivityLog>;
}

export interface PaymentLedgerUnitOfWork {
  createPaymentSettlement(input: CreatePaymentSettlementInput): Promise<{
    payment: Payment;
    settlement: Settlement;
    lines: SettlementLine[];
  }>;
  respondToPaymentConfirmation(
    payment: Payment,
    status: Extract<Payment['confirmationStatus'], 'confirmed' | 'rejected'>,
    actorUserId: string,
  ): Promise<Payment>;
  upsertPayment(payment: Payment): Promise<Payment>;
  upsertSettlement(settlement: Settlement): Promise<Settlement>;
  upsertSettlementLine(line: SettlementLine): Promise<SettlementLine>;
}

export interface ContentLedgerUnitOfWork {
  createRecurringTemplate(
    input: CreateRecurringTemplateInput,
  ): Promise<RecurringTemplate>;
  updateRecurringTemplate(
    template: RecurringTemplate,
    input: Partial<CreateRecurringTemplateInput> & {
      status?: RecurringTemplate['status'];
    },
  ): Promise<RecurringTemplate>;
  generateDueRecurringRecords(): Promise<string[]>;
  createReminder(input: CreateReminderInput): Promise<Reminder>;
  createSoftReminder(input: CreateSoftReminderInput): Promise<SoftReminder>;
  createAttachment(input: CreateAttachmentInput): Promise<Attachment>;
  upsertAttachment(attachment: Attachment): Promise<Attachment>;
  archiveAttachment(
    attachment: Attachment,
    actorUserId?: string | null,
  ): Promise<Attachment>;
  upsertComment(comment: Comment): Promise<Comment>;
  createComment(input: CreateCommentInput): Promise<Comment>;
  updateComment(comment: Comment, input: Partial<CreateCommentInput>): Promise<Comment>;
  deleteComment(comment: Comment, actorUserId?: string | null): Promise<Comment>;
  upsertSmartSuggestion(
    suggestion: SmartSuggestion | CreateSmartSuggestionInput,
  ): Promise<SmartSuggestion>;
  setSmartSuggestionStatus(
    suggestion: SmartSuggestion,
    status: SmartSuggestionStatus,
  ): Promise<SmartSuggestion>;
}

export interface SystemLedgerUnitOfWork {
  reset(): Promise<void>;
  resetSyncedData(): Promise<void>;
  restoreBackup(rawJson: string, mode: BackupMode): Promise<RestoreResult>;
  createExportLog(input: CreateExportLogInput): Promise<ExportLog>;
  createCsvImportBatch(input: CreateCsvImportBatchInput): Promise<CsvImportBatch>;
  upsertSyncQueueEntry(entry: SyncQueueEntry): Promise<SyncQueueEntry>;
  queueSyncOperation(input: QueueSyncOperationInput): Promise<SyncQueueEntry>;
  markSyncQueueEntry(
    entry: SyncQueueEntry,
    patch: Partial<SyncQueueEntry>,
  ): Promise<SyncQueueEntry>;
  upsertSyncConflict(conflict: SyncConflict): Promise<SyncConflict>;
  resolveSyncConflict(
    conflict: SyncConflict,
    resolution: ConflictResolution,
    actorUserId?: string | null,
  ): Promise<SyncConflict>;
  createNotification(input: CreateNotificationInput): Promise<AppNotification>;
  markNotificationRead(
    notification: AppNotification,
    readAt?: string,
  ): Promise<AppNotification>;
  createAuditLog(
    input: Omit<AuditLog, 'id' | 'createdAt' | 'deviceId'> & {
      deviceId?: string | null;
    },
  ): Promise<AuditLog>;
  submitAccountDeletionRequest(input: {
    userId: string;
    deleteLocalData: boolean;
    keepLocalArchive: boolean;
  }): Promise<AccountDeletionState>;
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  updateRate(currency: CurrencyCode, rateToSek: number): Promise<void>;
}

/**
 * Stable application-facing contract for one atomic local command.
 *
 * Entity-based repository APIs intentionally take current entities here. The
 * application command facades resolve those entities from `load()` inside the
 * transaction; presentation code only supplies IDs and patches.
 */
export interface LocalLedgerUnitOfWork
  extends SnapshotUnitOfWork<AppSnapshot>,
    MemberLedgerUnitOfWork,
    DebtLedgerUnitOfWork,
    GroupLedgerUnitOfWork,
    PaymentLedgerUnitOfWork,
    ContentLedgerUnitOfWork,
    SystemLedgerUnitOfWork {}

export type LocalLedgerPort = TransactionalSnapshotPort<
  AppSnapshot,
  LocalLedgerUnitOfWork
>;
