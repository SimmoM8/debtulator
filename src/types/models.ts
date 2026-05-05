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
  | 'resolved';

export type EventStatus = 'planning' | 'active' | 'finalising' | 'settled' | 'archived';

export type SplitMethod = 'equal';

export type LedgerEntryKind = 'simple_debt' | 'expense_obligation';

export type EntityKind = 'member' | 'debt' | 'event' | 'shared_expense';

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
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Debt = {
  id: string;
  type: 'simple';
  memberId: string;
  direction: DebtDirection;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes: string | null;
  debtDate: string;
  dueDate: string | null;
  tags: string[];
  eventId: string | null;
  status: DebtStatus;
  verificationStatus: VerificationStatus;
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
  entityKind: EntityKind;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
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
