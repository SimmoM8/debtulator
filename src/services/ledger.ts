import type {
  AppSettings,
  CurrencyCode,
  CurrencyRate,
  Debt,
  EventSettlementExplanation,
  LedgerEntry,
  Member,
  MoneyMap,
  ParticipantId,
  SettlementSuggestion,
  SharedExpense,
  VerificationStatus,
} from '@/src/types/models';
import { estimateMoneyMap } from '@/src/services/currency';
import { addMoney, roundMoney } from '@/src/utils/money';

const DEFAULT_SETTLEMENT_VERIFICATIONS: VerificationStatus[] = ['local_only', 'verified', 'resolved'];
const PERSONAL_BALANCE_EXCLUDED_VERIFICATIONS: VerificationStatus[] = ['rejected', 'disputed'];
const EPSILON = 0.005;

export function buildLedgerEntries(debts: Debt[], sharedExpenses: SharedExpense[]): LedgerEntry[] {
  const simpleEntries: LedgerEntry[] = debts.map((debt) => ({
    id: `ledger_${debt.id}`,
    kind: 'simple_debt',
    sourceId: debt.id,
    eventId: debt.eventId,
    fromId: debt.direction === 'they_owe_me' ? debt.memberId : 'me',
    toId: debt.direction === 'they_owe_me' ? 'me' : debt.memberId,
    amount: debt.amount,
    currency: debt.currency,
    title: debt.title,
    notes: debt.notes,
    date: debt.debtDate,
    tags: debt.tags,
    status: debt.status,
    verificationStatus: debt.verificationStatus,
  }));

  const expenseEntries = sharedExpenses.flatMap((expense) =>
    expense.generatedObligations.map<LedgerEntry>((obligation) => ({
      id: `ledger_${obligation.id}`,
      kind: 'expense_obligation',
      sourceId: obligation.id,
      expenseId: expense.id,
      eventId: expense.eventId,
      fromId: obligation.fromParticipantId,
      toId: obligation.toParticipantId,
      amount: obligation.amount,
      currency: obligation.currency,
      title: expense.title,
      notes: expense.notes,
      date: expense.expenseDate,
      tags: expense.tags,
      status: expense.status,
      verificationStatus: expense.verificationStatus,
    })),
  );

  return [...simpleEntries, ...expenseEntries].sort((a, b) => b.date.localeCompare(a.date));
}

export function isActiveLedgerEntry(entry: LedgerEntry) {
  return entry.status !== 'archived' && entry.status !== 'settled';
}

export function isIncludedInPersonalBalance(entry: LedgerEntry) {
  return isActiveLedgerEntry(entry) && !PERSONAL_BALANCE_EXCLUDED_VERIFICATIONS.includes(entry.verificationStatus);
}

export function isIncludedInSettlement(entry: LedgerEntry, includeStatuses = DEFAULT_SETTLEMENT_VERIFICATIONS) {
  return isActiveLedgerEntry(entry) && includeStatuses.includes(entry.verificationStatus);
}

export function participantName(participantId: ParticipantId, members: Member[]) {
  if (participantId === 'me') {
    return 'You';
  }
  return members.find((member) => member.id === participantId)?.displayName ?? 'Unknown member';
}

export function participantNameSentence(participantId: ParticipantId, members: Member[]) {
  if (participantId === 'me') {
    return 'you';
  }
  return members.find((member) => member.id === participantId)?.displayName ?? 'someone';
}

export function entryDirectionText(entry: LedgerEntry, members: Member[]) {
  const from = participantName(entry.fromId, members);
  const to = participantName(entry.toId, members);

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

export function entriesForEvent(eventId: string, entries: LedgerEntry[]) {
  return entries.filter((entry) => entry.eventId === eventId);
}

export function calculateEventNets(entries: LedgerEntry[], includeStatuses = DEFAULT_SETTLEMENT_VERIFICATIONS) {
  const nets: Record<ParticipantId, MoneyMap> = {};
  const includedEntries: LedgerEntry[] = [];
  const excludedEntries: LedgerEntry[] = [];

  for (const entry of entries) {
    if (!isIncludedInSettlement(entry, includeStatuses)) {
      excludedEntries.push(entry);
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

export function simplifySettlements(nets: Record<ParticipantId, MoneyMap>) {
  const currencies = new Set<CurrencyCode>();
  Object.values(nets).forEach((moneyMap) => {
    Object.keys(moneyMap).forEach((currency) => currencies.add(currency as CurrencyCode));
  });

  const suggestions: SettlementSuggestion[] = [];

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
        suggestions.push({
          id: `settlement_${currency}_${debtor.participantId}_${creditor.participantId}_${suggestions.length}`,
          fromId: debtor.participantId,
          toId: creditor.participantId,
          amount,
          currency,
        });
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

  return suggestions;
}

export function explainEventSettlement(eventId: string, entries: LedgerEntry[]): EventSettlementExplanation {
  const eventEntries = entriesForEvent(eventId, entries);
  const { nets, includedEntries, excludedEntries } = calculateEventNets(eventEntries);
  return {
    eventId,
    includedEntries,
    excludedEntries,
    participantNets: nets,
    suggestions: simplifySettlements(nets),
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
