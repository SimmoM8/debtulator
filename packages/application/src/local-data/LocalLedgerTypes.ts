import type {
  AppNotification,
  AttachmentKind,
  AttachmentTargetType,
  AttachmentVisibility,
  CommentTargetType,
  CommentVisibility,
  CsvImportBatch,
  CurrencyCode,
  Debt,
  DebtStatus,
  ExportLog,
  ExportType,
  Group,
  GroupRole,
  GroupStatus,
  Member,
  ParticipantId,
  Payment,
  RecurringTemplate,
  Reminder,
  SharedExpense,
  SharedGroupMember,
  Settlement,
  SettlementLine,
  SmartSuggestion,
  SmartSuggestionStatus,
  SmartSuggestionType,
  SoftReminder,
  SyncQueueEntry,
  SyncStatus,
  VerificationStatus,
} from '@debtulator/domain/models';

export type CreateMemberInput = {
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

export type CreateDebtInput = {
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

export type CreateGroupInput = {
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

export type CreateExpenseInput = {
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

export type CreateGroupInviteInput = {
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

export type CreateSharedGroupMemberInput = {
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

export type CreateGroupDebtInput = {
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

export type CreatePaymentSettlementInput = {
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

export type CreateRecurringTemplateInput = {
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

export type CreateAttachmentInput = {
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

export type CreateCommentInput = {
  targetType: CommentTargetType;
  targetId: string;
  groupId?: string | null;
  authorUserId?: string | null;
  localAuthorLabel?: string | null;
  body: string;
  visibility?: CommentVisibility;
  syncStatus?: SyncStatus;
};

export type CreateSmartSuggestionInput = {
  userId?: string | null;
  suggestionType: SmartSuggestionType;
  targetType?: SmartSuggestion['targetType'];
  targetId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  status?: SmartSuggestionStatus;
};

export type CreateExportLogInput = {
  userId?: string | null;
  exportType: ExportType;
  targetType?: ExportLog['targetType'];
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreateCsvImportBatchInput = {
  userId?: string | null;
  status?: CsvImportBatch['status'];
  sourceName?: string | null;
  rowCount: number;
  importedMemberCount?: number;
  importedDebtCount?: number;
  errorCount?: number;
  metadata?: Record<string, unknown>;
};

export type QueueSyncOperationInput = {
  entityType: SyncQueueEntry['entityType'];
  entityId: string;
  operation: SyncQueueEntry['operation'];
  payload?: Record<string, unknown>;
  dependencyIds?: string[];
};

export type CreateNotificationInput = Omit<
  AppNotification,
  'id' | 'createdAt' | 'readAt'
> & { readAt?: string | null };

export type CreateReminderInput = Omit<
  Reminder,
  'id' | 'createdAt' | 'updatedAt' | 'status'
> & { status?: Reminder['status'] };

export type CreateSoftReminderInput = Omit<
  SoftReminder,
  'id' | 'createdAt' | 'updatedAt' | 'status'
> & { status?: SoftReminder['status'] };
