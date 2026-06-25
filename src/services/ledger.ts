import type {
  AppSettings,
  CurrencyCode,
  CurrencyRate,
  Debt,
  DebtVerification,
  GroupDebt,
  GroupVerificationResponse,
  GroupSettlementSettings,
  GroupSettlementExplanation,
  ExcludedLedgerEntry,
  LedgerEntry,
  Member,
  MoneyMap,
  OverpaymentCredit,
  ParticipantId,
  Payment,
  ObligationPaymentStatus,
  SettlementLine,
  SettlementSourceRecordType,
  SettlementSuggestion,
  SettlementMatchStep,
  SharedGroupMember,
  SharedExpense,
  VerificationStatus,
} from '@/src/types/models';
import { estimateMoneyMap } from '@/src/services/currency';
import { addMoney, roundMoney } from '@/src/utils/money';

export const DEFAULT_GROUP_SETTLEMENT_SETTINGS: GroupSettlementSettings = {
  includePending: false,
  includePartiallyVerified: false,
  includeRejectedDisputed: false,
  includeArchived: false,
  includeSettled: false,
  directDebtOnly: false,
  verifiedOnly: false,
  includeLocalPrivate: true,
  convertedCurrency: false,
  settlementCurrency: null,
};

const DEFAULT_SETTLEMENT_VERIFICATIONS: VerificationStatus[] = ['local_only', 'verified', 'resolved'];
const PERSONAL_BALANCE_EXCLUDED_VERIFICATIONS: VerificationStatus[] = ['rejected', 'disputed'];
const EPSILON = 0.005;

export type LedgerConfirmationContext = {
  currentUserId?: string | null;
  debtVerifications?: DebtVerification[];
  groupVerificationResponses?: GroupVerificationResponse[];
};

export function buildLedgerEntries(
  debts: Debt[],
  sharedExpenses: SharedExpense[],
  groupDebts: GroupDebt[] = [],
  settlementLines: SettlementLine[] = [],
  payments: Payment[] = [],
  overpaymentCredits: OverpaymentCredit[] = [],
  confirmationContext: LedgerConfirmationContext = {},
): LedgerEntry[] {
  const simpleEntries: LedgerEntry[] = debts.flatMap((debt) => {
    const projection = simpleDebtLedgerProjection(debt, confirmationContext);
    if (!projection.include) {
      return [];
    }
    return [
      {
        id: `ledger_${debt.id}`,
        kind: 'simple_debt' as const,
        sourceId: debt.id,
        groupId: debt.groupId,
        fromId: debt.direction === 'they_owe_me' ? debt.memberId : 'me',
        toId: debt.direction === 'they_owe_me' ? 'me' : debt.memberId,
        amount: debt.amount,
        originalAmount: debt.amount,
        amountPaid: 0,
        remainingAmount: debt.amount,
        overpaidAmount: 0,
        paymentStatus:
          debt.status === 'archived'
            ? ('archived' as const)
            : ('unpaid' as const),
        currency: debt.currency,
        title: debt.title,
        notes: debt.notes,
        date: debt.debtDate,
        dueDate: debt.dueDate,
        tags: debt.tags,
        status: debt.status === 'settled' ? ('active' as const) : debt.status,
        verificationStatus: projection.verificationStatus,
        visibility: debt.visibility,
        syncStatus: debt.syncStatus,
      },
    ];
  });

  const expenseEntries = sharedExpenses.flatMap((expense) => {
    const projection = groupRecordLedgerProjection(
      expense.creatorUserId,
      expense.verificationStatus,
      'expense',
      expense.id,
      confirmationContext,
    );
    if (!projection.include) {
      return [];
    }
    return expense.generatedObligations.map<LedgerEntry>((obligation) => ({
      id: `ledger_${obligation.id}`,
      kind: 'expense_obligation',
      sourceId: obligation.id,
      expenseId: expense.id,
      groupId: expense.groupId,
      fromId: obligation.fromParticipantId,
      toId: obligation.toParticipantId,
      amount: obligation.amount,
      originalAmount: obligation.amount,
      amountPaid: 0,
      remainingAmount: obligation.amount,
      overpaidAmount: 0,
      paymentStatus: expense.status === 'archived' ? 'archived' : 'unpaid',
      currency: obligation.currency,
      title: expense.title,
      notes: expense.notes,
      date: expense.expenseDate,
      dueDate: expense.dueDate,
      tags: expense.tags,
      status: expense.status,
      verificationStatus: projection.verificationStatus,
      visibility: expense.visibility,
      syncStatus: expense.syncStatus,
    }));
  });

  const groupDebtEntries: LedgerEntry[] = groupDebts.flatMap((debt) => {
    const projection = groupRecordLedgerProjection(
      debt.creatorUserId,
      debt.verificationStatus,
      'debt',
      debt.id,
      confirmationContext,
    );
    if (!projection.include) {
      return [];
    }
    return [
      {
        id: `ledger_${debt.id}`,
        kind: 'group_direct_debt' as const,
        sourceId: debt.id,
        groupId: debt.groupId,
        fromId: debt.debtorGroupMemberId,
        toId: debt.creditorGroupMemberId,
        amount: debt.amount,
        originalAmount: debt.amount,
        amountPaid: 0,
        remainingAmount: debt.amount,
        overpaidAmount: 0,
        paymentStatus:
          debt.status === 'archived'
            ? ('archived' as const)
            : ('unpaid' as const),
        currency: debt.currency,
        title: debt.title,
        notes: debt.notes,
        date: debt.debtDate,
        dueDate: debt.dueDate,
        tags: debt.tags,
        status: debt.status,
        verificationStatus: projection.verificationStatus,
        visibility: 'shared_group' as const,
        syncStatus: debt.syncStatus,
      },
    ];
  });

  const overpaymentEntries = overpaymentCredits
    .filter((credit) => credit.status === 'open' && credit.amount > EPSILON)
    .map<LedgerEntry>((credit) => ({
      id: `ledger_${credit.id}`,
      kind: 'overpayment_credit',
      sourceId: credit.id,
      groupId: credit.groupId,
      fromId: credit.payeeGroupMemberId ?? credit.payeeMemberId ?? 'me',
      toId: credit.payerGroupMemberId ?? credit.payerMemberId ?? 'me',
      amount: credit.amount,
      originalAmount: credit.amount,
      amountPaid: 0,
      remainingAmount: credit.amount,
      overpaidAmount: 0,
      paymentStatus: 'unpaid',
      currency: credit.currency,
      title: 'Unallocated overpayment credit',
      notes: `Created from payment ${credit.sourcePaymentId}.`,
      date: credit.createdAt.slice(0, 10),
      dueDate: null,
      tags: [],
      status: 'active',
      verificationStatus: 'local_only',
      visibility: credit.groupId ? 'shared_group' : 'private',
      syncStatus: 'local_only',
    }));

  return applySettlementsToEntries(
    [...simpleEntries, ...expenseEntries, ...groupDebtEntries, ...overpaymentEntries],
    settlementLines,
    payments,
    confirmationContext.currentUserId,
  ).sort((a, b) => b.date.localeCompare(a.date));
}

function simpleDebtLedgerProjection(
  debt: Debt,
  context: LedgerConfirmationContext,
): { include: boolean; verificationStatus: VerificationStatus } {
  const currentUserId = context.currentUserId;
  if (!currentUserId) {
    return { include: true, verificationStatus: debt.verificationStatus };
  }
  const pending = (context.debtVerifications ?? [])
    .filter(
      (verification) =>
        verification.debtId === debt.id && verification.status === 'pending',
    )
    .sort((first, second) => second.requestedAt.localeCompare(first.requestedAt))[0];
  if (!pending) {
    return { include: true, verificationStatus: debt.verificationStatus };
  }
  if (pending.requesterUserId === currentUserId) {
    return { include: true, verificationStatus: 'local_only' };
  }
  if (pending.responderUserId === currentUserId) {
    return pending.requestType === 'creation'
      ? { include: false, verificationStatus: 'pending' }
      : { include: true, verificationStatus: 'verified' };
  }
  return { include: false, verificationStatus: 'pending' };
}

function groupRecordLedgerProjection(
  creatorUserId: string | null,
  verificationStatus: VerificationStatus,
  targetType: GroupVerificationResponse['targetType'],
  targetId: string,
  context: LedgerConfirmationContext,
): { include: boolean; verificationStatus: VerificationStatus } {
  const currentUserId = context.currentUserId;
  if (
    !currentUserId ||
    !['pending', 'partially_verified'].includes(verificationStatus)
  ) {
    return { include: true, verificationStatus };
  }
  if (creatorUserId === currentUserId) {
    return { include: true, verificationStatus: 'local_only' };
  }
  const response = (context.groupVerificationResponses ?? [])
    .filter(
      (item) =>
        item.targetType === targetType &&
        item.targetId === targetId &&
        item.linkedUserId === currentUserId,
    )
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];
  return response?.responseStatus === 'verified'
    ? { include: true, verificationStatus: 'verified' }
    : { include: false, verificationStatus };
}

export function isActiveLedgerEntry(entry: LedgerEntry) {
  return entry.status !== 'archived' && entry.status !== 'settled';
}

export function isIncludedInPersonalBalance(entry: LedgerEntry) {
  return isActiveLedgerEntry(entry) && !PERSONAL_BALANCE_EXCLUDED_VERIFICATIONS.includes(entry.verificationStatus);
}

export function isIncludedInSettlement(entry: LedgerEntry, includeStatuses = DEFAULT_SETTLEMENT_VERIFICATIONS) {
  return isActiveLedgerEntry(entry) && entry.remainingAmount > EPSILON && includeStatuses.includes(entry.verificationStatus);
}

export function participantName(participantId: ParticipantId, members: Member[], sharedGroupMembers: SharedGroupMember[] = []) {
  if (participantId === 'me') {
    return 'You';
  }
  const groupMember = sharedGroupMembers.find((member) => member.id === participantId);
  if (groupMember) {
    return groupMember.alias || groupMember.displayName;
  }
  return members.find((member) => member.id === participantId)?.displayName ?? 'Unknown member';
}

export function participantNameSentence(participantId: ParticipantId, members: Member[], sharedGroupMembers: SharedGroupMember[] = []) {
  if (participantId === 'me') {
    return 'you';
  }
  const groupMember = sharedGroupMembers.find((member) => member.id === participantId);
  if (groupMember) {
    return groupMember.alias || groupMember.displayName;
  }
  return members.find((member) => member.id === participantId)?.displayName ?? 'someone';
}

export function entryDirectionText(entry: LedgerEntry, members: Member[], sharedGroupMembers: SharedGroupMember[] = []) {
  const from = participantName(entry.fromId, members, sharedGroupMembers);
  const to = participantName(entry.toId, members, sharedGroupMembers);

  if (entry.fromId === 'me') {
    return `You owe ${to}`;
  }
  if (entry.toId === 'me') {
    return `${from} owes you`;
  }

  return `${from} owes ${to}`;
}

export function calculateMemberBalances(entries: LedgerEntry[]) {
  const balances: Record<string, MoneyMap> = {};

  for (const entry of entries) {
    if (!isIncludedInPersonalBalance(entry)) {
      continue;
    }

    if (entry.fromId === 'me' && entry.toId !== 'me') {
      const memberId = entry.toId;
      balances[memberId] ??= {};
      addMoney(balances[memberId], entry.currency, -entry.amount);
    }

    if (entry.toId === 'me' && entry.fromId !== 'me') {
      const memberId = entry.fromId;
      balances[memberId] ??= {};
      addMoney(balances[memberId], entry.currency, entry.amount);
    }
  }

  return balances;
}

export function calculatePersonalTotals(entries: LedgerEntry[]) {
  const owedToMe: MoneyMap = {};
  const iOwe: MoneyMap = {};
  const net: MoneyMap = {};

  for (const entry of entries) {
    if (!isIncludedInPersonalBalance(entry)) {
      continue;
    }

    if (entry.toId === 'me' && entry.fromId !== 'me') {
      addMoney(owedToMe, entry.currency, entry.amount);
      addMoney(net, entry.currency, entry.amount);
    }

    if (entry.fromId === 'me' && entry.toId !== 'me') {
      addMoney(iOwe, entry.currency, entry.amount);
      addMoney(net, entry.currency, -entry.amount);
    }
  }

  return { owedToMe, iOwe, net };
}

export function entriesForMember(memberId: string, entries: LedgerEntry[]) {
  return entries.filter((entry) => entry.fromId === memberId || entry.toId === memberId);
}

export function entriesForGroup(groupId: string, entries: LedgerEntry[]) {
  return entries.filter((entry) => entry.groupId === groupId);
}

export function calculateGroupNets(entries: LedgerEntry[], includeStatuses = DEFAULT_SETTLEMENT_VERIFICATIONS) {
  const nets: Record<ParticipantId, MoneyMap> = {};
  const includedEntries: LedgerEntry[] = [];
  const excludedEntries: ExcludedLedgerEntry[] = [];

  for (const entry of entries) {
    if (!isIncludedInSettlement(entry, includeStatuses)) {
      excludedEntries.push({ entry, reason: excludedReason(entry) ?? 'pending_excluded' });
      continue;
    }

    includedEntries.push(entry);
    nets[entry.fromId] ??= {};
    nets[entry.toId] ??= {};
    addMoney(nets[entry.fromId], entry.currency, -entry.amount);
    addMoney(nets[entry.toId], entry.currency, entry.amount);
  }

  return { nets, includedEntries, excludedEntries };
}

export function calculateGroupNetsWithSettings(
  entries: LedgerEntry[],
  settings: GroupSettlementSettings = DEFAULT_GROUP_SETTLEMENT_SETTINGS,
) {
  const nets: Record<ParticipantId, MoneyMap> = {};
  const includedEntries: LedgerEntry[] = [];
  const excludedEntries: ExcludedLedgerEntry[] = [];

  for (const entry of entries) {
    const reason = excludedReason(entry, settings);
    if (reason) {
      excludedEntries.push({ entry, reason });
      continue;
    }

    includedEntries.push(entry);
    nets[entry.fromId] ??= {};
    nets[entry.toId] ??= {};
    addMoney(nets[entry.fromId], entry.currency, -entry.amount);
    addMoney(nets[entry.toId], entry.currency, entry.amount);
  }

  return { nets, includedEntries, excludedEntries };
}

function excludedReason(
  entry: LedgerEntry,
  settings: GroupSettlementSettings = DEFAULT_GROUP_SETTLEMENT_SETTINGS,
): ExcludedLedgerEntry['reason'] | null {
  if (entry.status === 'archived' && !settings.includeArchived) {
    return 'archived';
  }
  if (entry.status === 'settled' && !settings.includeSettled) {
    return 'settled';
  }
  if (entry.verificationStatus === 'cancelled') {
    return 'cancelled';
  }
  if (settings.directDebtOnly && entry.kind !== 'simple_debt' && entry.kind !== 'group_direct_debt') {
    return 'pending_excluded';
  }
  if (settings.verifiedOnly && entry.verificationStatus !== 'verified') {
    return 'pending_excluded';
  }
  if (!settings.includeLocalPrivate && entry.verificationStatus === 'local_only') {
    return 'pending_excluded';
  }
  if (entry.remainingAmount <= EPSILON && !settings.includeSettled) {
    return 'settled';
  }
  if (entry.verificationStatus === 'rejected' && !settings.includeRejectedDisputed) {
    return 'rejected';
  }
  if (entry.verificationStatus === 'disputed' && !settings.includeRejectedDisputed) {
    return 'disputed';
  }
  if (entry.verificationStatus === 'pending' && !settings.includePending) {
    return 'pending_excluded';
  }
  if (entry.verificationStatus === 'partially_verified' && !settings.includePartiallyVerified) {
    return 'pending_excluded';
  }
  return null;
}

export function sourceRecordTypeForEntry(entry: LedgerEntry): SettlementSourceRecordType {
  switch (entry.kind) {
    case 'simple_debt':
      return 'simple_debt';
    case 'group_direct_debt':
      return 'group_debt';
    case 'overpayment_credit':
      return 'overpayment_credit';
    case 'expense_obligation':
    default:
      return 'shared_expense_obligation';
  }
}

export function activeSettlementLines(
  lines: SettlementLine[],
  payments: Payment[],
  currentUserId?: string | null,
) {
  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));
  const seenRemoteIds = new Set<string>();
  return lines.filter((line) => {
    if (line.remoteId) {
      if (seenRemoteIds.has(line.remoteId)) {
        return false;
      }
      seenRemoteIds.add(line.remoteId);
    }
    const payment = line.paymentId ? paymentById.get(line.paymentId) : null;
    if (
      payment?.confirmationStatus === 'pending_confirmation' &&
      currentUserId &&
      payment.createdByUserId !== currentUserId
    ) {
      return false;
    }
    return !payment || !['rejected', 'cancelled', 'archived'].includes(payment.status);
  });
}

export function applySettlementsToEntries(
  entries: LedgerEntry[],
  lines: SettlementLine[],
  payments: Payment[],
  currentUserId?: string | null,
) {
  const appliedBySource = new Map<string, number>();
  for (const line of activeSettlementLines(lines, payments, currentUserId)) {
    const key = `${line.sourceRecordType}:${line.sourceRecordId}:${line.currency}`;
    appliedBySource.set(key, roundMoney((appliedBySource.get(key) ?? 0) + line.appliedAmount));
  }

  return entries.map((entry) => {
    const key = `${sourceRecordTypeForEntry(entry)}:${entry.sourceId}:${entry.currency}`;
    const amountPaid = roundMoney(appliedBySource.get(key) ?? 0);
    const remainingAmount = roundMoney(Math.max(entry.originalAmount - amountPaid, 0));
    const overpaidAmount = roundMoney(Math.max(amountPaid - entry.originalAmount, 0));
    const paymentStatus: ObligationPaymentStatus =
      entry.status === 'archived'
        ? 'archived'
        : remainingAmount <= EPSILON && overpaidAmount <= EPSILON && amountPaid > EPSILON
          ? 'paid'
          : overpaidAmount > EPSILON
            ? 'overpaid'
            : amountPaid > EPSILON
              ? 'partially_paid'
              : 'unpaid';
    return {
      ...entry,
      amount: remainingAmount,
      amountPaid,
      remainingAmount,
      overpaidAmount,
      paymentStatus,
    };
  });
}

export function simplifySettlements(nets: Record<ParticipantId, MoneyMap>) {
  return simplifySettlementsDetailed(nets).suggestions;
}

export function simplifySettlementsDetailed(nets: Record<ParticipantId, MoneyMap>) {
  const currencies = new Set<CurrencyCode>();
  Object.values(nets).forEach((moneyMap) => {
    Object.keys(moneyMap).forEach((currency) => currencies.add(currency as CurrencyCode));
  });

  const suggestions: SettlementSuggestion[] = [];
  const steps: SettlementMatchStep[] = [];

  for (const currency of currencies) {
    const creditors = Object.entries(nets)
      .map(([participantId, map]) => ({ participantId, amount: roundMoney(map[currency] ?? 0) }))
      .filter((item) => item.amount > EPSILON)
      .sort((a, b) => b.amount - a.amount);
    const debtors = Object.entries(nets)
      .map(([participantId, map]) => ({ participantId, amount: roundMoney(Math.abs(Math.min(map[currency] ?? 0, 0))) }))
      .filter((item) => item.amount > EPSILON)
      .sort((a, b) => b.amount - a.amount);

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];
      const amount = roundMoney(Math.min(creditor.amount, debtor.amount));

      if (amount > EPSILON) {
        const step = {
          currency,
          fromId: debtor.participantId,
          toId: creditor.participantId,
          amount,
        };
        suggestions.push({
          id: `settlement_${currency}_${debtor.participantId}_${creditor.participantId}_${suggestions.length}`,
          ...step,
          currency,
          explanation: {
            debtorStartingAmount: debtor.amount,
            creditorStartingAmount: creditor.amount,
          },
        });
        steps.push(step);
      }

      creditor.amount = roundMoney(creditor.amount - amount);
      debtor.amount = roundMoney(debtor.amount - amount);

      if (creditor.amount <= EPSILON) {
        creditorIndex += 1;
      }
      if (debtor.amount <= EPSILON) {
        debtorIndex += 1;
      }
    }
  }

  return { suggestions, steps };
}

export function explainGroupSettlement(
  groupId: string,
  entries: LedgerEntry[],
  settings: GroupSettlementSettings = DEFAULT_GROUP_SETTLEMENT_SETTINGS,
): GroupSettlementExplanation {
  const groupEntries = entriesForGroup(groupId, entries);
  const { nets, includedEntries, excludedEntries } = calculateGroupNetsWithSettings(groupEntries, settings);
  const { suggestions, steps } = simplifySettlementsDetailed(nets);
  return {
    groupId,
    includedEntries,
    excludedEntries,
    participantNets: nets,
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      groupId,
      includedRecordIds: includedEntries.map((entry) => entry.id),
    })),
    settings,
    settlementSteps: steps,
  };
}

export function memberNetEstimate(
  memberId: string,
  balances: Record<string, MoneyMap>,
  settings: AppSettings,
  currencyRates: CurrencyRate[],
) {
  return estimateMoneyMap(balances[memberId] ?? {}, settings, currencyRates);
}
