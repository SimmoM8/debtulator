export type CurrencyCode = 'SEK' | 'AUD' | 'EUR' | 'USD' | 'GBP';

export type ParticipantId = 'me' | string;

export type DebtDirection = 'they_owe_me' | 'i_owe_them';

export type DebtStatus = 'active' | 'settled' | 'archived';

export type VerificationStatus =
  | 'local_only'
  | 'pending'
  | 'partially_verified'
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

export type DebtVisibility = 'private' | 'shared_with_involved_member' | 'future_event_shared' | 'shared_event';

export type SyncStatus =
  | 'local_only'
  | 'pending_upload'
  | 'synced'
  | 'pending_update'
  | 'sync_error'
  | 'remote_deleted';

export type EventStatus = 'planning' | 'active' | 'finalising' | 'settled' | 'archived';

export type EventVisibility = 'private' | 'shared';

export type EventRole = 'owner' | 'admin' | 'member' | 'viewer';

export type EventParticipantStatus = 'active' | 'removed' | 'left' | 'invited';

export type EventInviteStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export type EventMemberType = 'linked_user' | 'unlinked_placeholder';

export type EventMemberStatus = 'active' | 'archived' | 'merged' | 'claim_pending';

export type EventMemberClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type EventDuplicateWarningStatus = 'active' | 'ignored' | 'resolved';

export type EventDuplicateWarningConfidence = 'low' | 'medium' | 'high';

export type EventVerificationTargetType = 'expense' | 'debt' | 'split';

export type SplitMethod = 'equal';

export type LedgerEntryKind = 'simple_debt' | 'expense_obligation' | 'event_direct_debt';

export type EntityKind =
  | 'member'
  | 'debt'
  | 'event'
  | 'shared_expense'
  | 'event_invite'
  | 'event_member'
  | 'event_member_claim'
  | 'event_duplicate_warning'
  | 'event_debt'
  | 'event_verification';

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
  localId: string | null;
  remoteId: string | null;
  ownerUserId: string | null;
  name: string;
  notes: string | null;
  defaultCurrency: CurrencyCode;
  allowedCurrencies: CurrencyCode[];
  tags: string[];
  status: EventStatus;
  visibility: EventVisibility;
  syncStatus: SyncStatus;
  archived: boolean;
  archivedAt: string | null;
  finalisedAt: string | null;
  lockedAt: string | null;
  ignoredDuplicateKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type EventParticipant = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  userId: string;
  role: EventRole;
  status: EventParticipantStatus;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type EventInvite = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  inviterUserId: string;
  invitedUserId: string | null;
  invitedEmail: string | null;
  invitedPhone: string | null;
  invitedDisplayName: string;
  offeredRole: Exclude<EventRole, 'owner'>;
  status: EventInviteStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  syncStatus: SyncStatus;
};

export type SharedEventMember = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  type: EventMemberType;
  linkedUserId: string | null;
  displayName: string;
  alias: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdByUserId: string | null;
  status: EventMemberStatus;
  mergedIntoEventMemberId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type EventMemberClaim = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  eventMemberId: string;
  remoteEventMemberId: string | null;
  claimantUserId: string;
  status: EventMemberClaimStatus;
  message: string | null;
  respondedByUserId: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type EventDuplicateWarning = {
  id: string;
  remoteId: string | null;
  eventId: string;
  eventMemberIdA: string;
  eventMemberIdB: string;
  reason: string;
  confidence: EventDuplicateWarningConfidence;
  status: EventDuplicateWarningStatus;
  ignoredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
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
  creatorUserId: string | null;
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

export type EventDebt = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  creatorUserId: string | null;
  debtorEventMemberId: string;
  creditorEventMemberId: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  debtDate: string;
  tags: string[];
  verificationStatus: VerificationStatus;
  settlementStatus: DebtStatus;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  syncStatus: SyncStatus;
};

export type EventVerificationResponse = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  targetType: EventVerificationTargetType;
  targetId: string;
  remoteTargetId: string | null;
  eventMemberId: string;
  linkedUserId: string | null;
  responseStatus: VerificationStatus;
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type EventActivityLog = {
  id: string;
  remoteId: string | null;
  eventId: string;
  remoteEventId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  syncStatus: SyncStatus;
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
  eventId?: string;
  fromId: ParticipantId;
  toId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  includedRecordIds?: string[];
  explanation?: Record<string, unknown>;
};

export type EventSettlementSettings = {
  includePending: boolean;
  includePartiallyVerified: boolean;
  includeRejectedDisputed: boolean;
  includeArchived: boolean;
  includeSettled: boolean;
};

export type ExcludedLedgerEntry = {
  entry: LedgerEntry;
  reason: 'rejected' | 'disputed' | 'archived' | 'settled' | 'pending_excluded' | 'cancelled';
};

export type SettlementMatchStep = {
  currency: CurrencyCode;
  fromId: ParticipantId;
  toId: ParticipantId;
  amount: number;
};

export type EventSettlementExplanation = {
  eventId: string;
  includedEntries: LedgerEntry[];
  excludedEntries: ExcludedLedgerEntry[];
  participantNets: Record<ParticipantId, MoneyMap>;
  suggestions: SettlementSuggestion[];
  settings: EventSettlementSettings;
  settlementSteps: SettlementMatchStep[];
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
  visibility: EventVisibility | 'all';
  role: EventRole | 'all';
  attention: 'all' | 'pending_invites' | 'rejected_or_disputed' | 'unsettled';
  tag: string | null;
  archivedMode: 'active' | 'archived' | 'all';
  currency: CurrencyCode | 'all';
  sort: SortMode;
};
