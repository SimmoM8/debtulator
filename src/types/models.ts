export type CurrencyCode = 'SEK' | 'AUD' | 'EUR' | 'USD' | 'GBP';

export type ParticipantId = 'me' | string;

export type DebtDirection = 'they_owe_me' | 'i_owe_them';

export type DebtStatus = 'active' | 'settled' | 'archived';

export type VerificationStatus =
  | 'local_only'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'disputed'
  | 'resolved'
  | 'cancelled';

export type MemberLinkStatus =
  | 'unlinked'
  | 'invite_pending'
  | 'linked'
  | 'link_rejected'
  | 'link_removed';

export type LinkRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export type DebtVisibility = 'private' | 'shared_with_involved_member' | 'future_event_shared';

export type SyncStatus =
  | 'local_only'
  | 'pending_upload'
  | 'synced'
  | 'pending_update'
  | 'sync_error'
  | 'remote_deleted';

export type EventStatus = 'planning' | 'active' | 'finalising' | 'settled' | 'archived';

export type SplitMethod = 'equal';

export type LedgerEntryKind = 'simple_debt' | 'expense_obligation';

export type EntityKind = 'member' | 'debt' | 'event' | 'shared_expense';

export type ActivityTargetKind =
  | EntityKind
  | 'member_link'
  | 'link_request'
  | 'debt_verification'
  | 'profile';

export type SortMode =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'name_asc'
  | 'balance_desc';

export type Member = {
  id: string;
  displayName: string;
  notes: string | null;
  email: string | null;
  phone: string | null;
  remoteId: string | null;
  linkedUserId: string | null;
  linkStatus: MemberLinkStatus;
  linkRequestId: string | null;
  linkedProfileDisplayName: string | null;
  linkedProfileEmail: string | null;
  linkedProfilePhone: string | null;
  syncStatus: SyncStatus;
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Debt = {
  id: string;
  type: 'simple';
  memberId: string;
  remoteId: string | null;
  verificationRequestId: string | null;
  visibility: DebtVisibility;
  syncStatus: SyncStatus;
  direction: DebtDirection;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  sharedNotes: string | null;
  debtDate: string;
  dueDate: string | null;
  tags: string[];
  eventId: string | null;
  status: DebtStatus;
  verificationStatus: VerificationStatus;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectedByUserId: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  disputeReason: string | null;
  resolutionNote: string | null;
  suggestedChange: SuggestedDebtChange | null;
  createdAt: string;
  updatedAt: string;
};

export type EventMember = {
  eventId: string;
  memberId: string;
  createdAt: string;
};

export type Event = {
  id: string;
  name: string;
  notes: string | null;
  defaultCurrency: CurrencyCode;
  tags: string[];
  status: EventStatus;
  archived: boolean;
  ignoredDuplicateKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type GeneratedObligation = {
  id: string;
  expenseId: string;
  eventId: string;
  fromParticipantId: ParticipantId;
  toParticipantId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
};

export type SharedExpense = {
  id: string;
  remoteId: string | null;
  eventId: string;
  payerId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  expenseDate: string;
  participantIds: ParticipantId[];
  splitMethod: SplitMethod;
  generatedObligations: GeneratedObligation[];
  tags: string[];
  status: DebtStatus;
  verificationStatus: VerificationStatus;
  visibility: DebtVisibility;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  entityKind: ActivityTargetKind;
  entityId: string;
  actorUserId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  baseCurrency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
};

export type LinkRequest = {
  id: string;
  remoteId: string | null;
  requesterUserId: string;
  targetUserId: string | null;
  targetEmail: string | null;
  targetPhone: string | null;
  requesterMemberId: string;
  requesterLabel: string;
  status: LinkRequestStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type SuggestedDebtChange = {
  amount?: number;
  currency?: CurrencyCode;
  debtDate?: string;
  note?: string;
  reason?: string;
};

export type DebtVerification = {
  id: string;
  remoteId: string | null;
  debtId: string;
  remoteDebtId: string | null;
  requesterUserId: string;
  responderUserId: string;
  status: VerificationStatus;
  rejectionReason: string | null;
  suggestedChange: SuggestedDebtChange | null;
  requestedAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type CurrencyRate = {
  currency: CurrencyCode;
  rateToSek: number;
  updatedAt: string;
};

export type AppSettings = {
  baseCurrency: CurrencyCode;
  showEstimatedBase: boolean;
  theme: 'system' | 'light' | 'dark';
};

export type LedgerEntry = {
  id: string;
  kind: LedgerEntryKind;
  sourceId: string;
  expenseId?: string;
  eventId: string | null;
  fromId: ParticipantId;
  toId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  date: string;
  tags: string[];
  status: DebtStatus;
  verificationStatus: VerificationStatus;
  visibility: DebtVisibility;
  syncStatus: SyncStatus;
};

export type MoneyMap = Partial<Record<CurrencyCode, number>>;

export type SettlementSuggestion = {
  id: string;
  fromId: ParticipantId;
  toId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
};

export type EventSettlementExplanation = {
  eventId: string;
  includedEntries: LedgerEntry[];
  excludedEntries: LedgerEntry[];
  participantNets: Record<ParticipantId, MoneyMap>;
  suggestions: SettlementSuggestion[];
};

export type DuplicateWarning = {
  key: string;
  eventId: string;
  memberAId: string;
  memberBId: string;
  reason: 'same_name' | 'similar_name' | 'same_email' | 'same_phone';
  message: string;
};

export type DebtFilters = {
  query: string;
  memberId: string | null;
  eventId: string | null;
  minAmount: string;
  maxAmount: string;
  currency: CurrencyCode | 'all';
  direction: DebtDirection | 'all';
  status: DebtStatus | 'all';
  verificationStatus: VerificationStatus | 'all';
  linkMode: 'all' | 'linked' | 'unlinked';
  visibility: DebtVisibility | 'all';
  tag: string | null;
  kind: LedgerEntryKind | 'all';
  sort: SortMode;
};

export type MemberFilters = {
  query: string;
  tag: string | null;
  balanceMode: 'all' | 'has_balance';
  archivedMode: 'active' | 'archived' | 'all';
  sort: SortMode;
};

export type EventFilters = {
  query: string;
  status: EventStatus | 'all';
  tag: string | null;
  archivedMode: 'active' | 'archived' | 'all';
  currency: CurrencyCode | 'all';
  sort: SortMode;
};
