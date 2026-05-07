import type {
  AppSettings,
  CurrencyCode,
  CurrencyRate,
  Event,
  LedgerEntry,
  Member,
  MoneyMap,
  Payment,
  SharedEventMember,
  SharedExpense,
  Settlement,
} from '@/src/types/models';
import { estimateMoneyMap } from '@/src/services/currency';
import { entriesForEvent, participantName } from '@/src/services/ledger';
import { addMoney, roundMoney, sumMoneyMap } from '@/src/utils/money';

export type AnalyticsFilters = {
  startDate?: string | null;
  endDate?: string | null;
  currency?: CurrencyCode | 'all';
  eventId?: string | null;
  memberId?: string | null;
  includeArchived?: boolean;
  includeRejectedDisputed?: boolean;
  estimatedBaseCurrency?: boolean;
};

export type ChartDatum = {
  label: string;
  value: number;
  valueSecondary?: number;
  currency?: CurrencyCode;
  metadata?: Record<string, unknown>;
};

const EXCLUDED_VERIFICATION = new Set(['rejected', 'disputed', 'cancelled']);

export function filterAnalyticsEntries(entries: LedgerEntry[], filters: AnalyticsFilters = {}) {
  return entries.filter((entry) => {
    const dateMatch =
      (!filters.startDate || entry.date >= filters.startDate) &&
      (!filters.endDate || entry.date <= filters.endDate);
    const currencyMatch = !filters.currency || filters.currency === 'all' || entry.currency === filters.currency;
    const eventMatch = !filters.eventId || entry.eventId === filters.eventId;
    const memberMatch = !filters.memberId || entry.fromId === filters.memberId || entry.toId === filters.memberId;
    const archivedMatch = filters.includeArchived || entry.status !== 'archived';
    const rejectedMatch = filters.includeRejectedDisputed || !EXCLUDED_VERIFICATION.has(entry.verificationStatus);
    return dateMatch && currencyMatch && eventMatch && memberMatch && archivedMatch && rejectedMatch;
  });
}

export function monthlyOwedOwingTrend(entries: LedgerEntry[], filters: AnalyticsFilters = {}) {
  const rows = new Map<string, { label: string; owedToMe: MoneyMap; iOwe: MoneyMap }>();
  for (const entry of filterAnalyticsEntries(entries, filters)) {
    const label = entry.date.slice(0, 7);
    const row = rows.get(label) ?? { label, owedToMe: {}, iOwe: {} };
    if (entry.toId === 'me' && entry.fromId !== 'me') {
      addMoney(row.owedToMe, entry.currency, entry.originalAmount);
    }
    if (entry.fromId === 'me' && entry.toId !== 'me') {
      addMoney(row.iOwe, entry.currency, entry.originalAmount);
    }
    rows.set(label, row);
  }
  return Array.from(rows.values()).sort((first, second) => first.label.localeCompare(second.label));
}

export function chartTrendForCurrency(
  trend: ReturnType<typeof monthlyOwedOwingTrend>,
  currency: CurrencyCode,
) {
  return trend.map<ChartDatum>((row) => ({
    label: row.label,
    value: row.owedToMe[currency] ?? 0,
    valueSecondary: row.iOwe[currency] ?? 0,
    currency,
  }));
}

export function debtByTag(entries: LedgerEntry[], filters: AnalyticsFilters = {}) {
  const totals = new Map<string, MoneyMap>();
  for (const entry of filterAnalyticsEntries(entries, filters)) {
    const tags = entry.tags.length ? entry.tags : ['Untagged'];
    const share = roundMoney(entry.originalAmount / tags.length);
    for (const tag of tags) {
      const map = totals.get(tag) ?? {};
      addMoney(map, entry.currency, share);
      totals.set(tag, map);
    }
  }
  return Array.from(totals.entries())
    .map(([tag, totalsByCurrency]) => ({ tag, totalsByCurrency }))
    .sort((first, second) => sumMoneyMap(second.totalsByCurrency) - sumMoneyMap(first.totalsByCurrency));
}

export function debtByMember(entries: LedgerEntry[], members: Member[], sharedMembers: SharedEventMember[], filters: AnalyticsFilters = {}) {
  const rows = new Map<string, { participantId: string; name: string; owedToMe: MoneyMap; iOwe: MoneyMap; net: MoneyMap }>();
  for (const entry of filterAnalyticsEntries(entries, filters)) {
    for (const participantId of [entry.fromId, entry.toId]) {
      if (participantId === 'me') {
        continue;
      }
      const row = rows.get(participantId) ?? {
        participantId,
        name: participantName(participantId, members, sharedMembers),
        owedToMe: {},
        iOwe: {},
        net: {},
      };
      if (entry.toId === 'me' && entry.fromId === participantId) {
        addMoney(row.owedToMe, entry.currency, entry.remainingAmount);
        addMoney(row.net, entry.currency, entry.remainingAmount);
      }
      if (entry.fromId === 'me' && entry.toId === participantId) {
        addMoney(row.iOwe, entry.currency, entry.remainingAmount);
        addMoney(row.net, entry.currency, -entry.remainingAmount);
      }
      rows.set(participantId, row);
    }
  }
  return Array.from(rows.values()).sort((first, second) => sumMoneyMap(second.net) - sumMoneyMap(first.net));
}

export function paidVsUnpaidSummary(entries: LedgerEntry[], filters: AnalyticsFilters = {}) {
  const totals: Record<string, MoneyMap> = {
    original: {},
    paid: {},
    remaining: {},
    partiallyPaid: {},
    fullyPaid: {},
    overpaid: {},
  };
  const counts = {
    unpaid: 0,
    partiallyPaid: 0,
    paid: 0,
    overpaid: 0,
  };

  for (const entry of filterAnalyticsEntries(entries, filters)) {
    addMoney(totals.original, entry.currency, entry.originalAmount);
    addMoney(totals.paid, entry.currency, entry.amountPaid);
    addMoney(totals.remaining, entry.currency, entry.remainingAmount);
    if (entry.paymentStatus === 'partially_paid') {
      counts.partiallyPaid += 1;
      addMoney(totals.partiallyPaid, entry.currency, entry.remainingAmount);
    } else if (entry.paymentStatus === 'paid') {
      counts.paid += 1;
      addMoney(totals.fullyPaid, entry.currency, entry.originalAmount);
    } else if (entry.paymentStatus === 'overpaid') {
      counts.overpaid += 1;
      addMoney(totals.overpaid, entry.currency, entry.overpaidAmount);
    } else {
      counts.unpaid += 1;
    }
  }

  return { totals, counts };
}

export function verifiedVsPendingSummary(entries: LedgerEntry[], filters: AnalyticsFilters = {}) {
  const totals: Record<string, MoneyMap> = {
    verified: {},
    pending: {},
    partiallyVerified: {},
    localPrivate: {},
    rejected: {},
    disputed: {},
    resolved: {},
  };

  for (const entry of filterAnalyticsEntries(entries, { ...filters, includeRejectedDisputed: true })) {
    const key =
      entry.verificationStatus === 'verified'
        ? 'verified'
        : entry.verificationStatus === 'pending'
          ? 'pending'
          : entry.verificationStatus === 'partially_verified'
            ? 'partiallyVerified'
            : entry.verificationStatus === 'rejected'
              ? 'rejected'
              : entry.verificationStatus === 'disputed'
                ? 'disputed'
                : entry.verificationStatus === 'resolved'
                  ? 'resolved'
                  : 'localPrivate';
    addMoney(totals[key], entry.currency, entry.originalAmount);
  }

  return totals;
}

export function eventSpendingBreakdown(input: {
  event: Event;
  entries: LedgerEntry[];
  sharedExpenses: SharedExpense[];
  members: Member[];
  sharedEventMembers: SharedEventMember[];
}) {
  const eventEntries = entriesForEvent(input.event.id, input.entries);
  const totalByCurrency: MoneyMap = {};
  for (const expense of input.sharedExpenses.filter((item) => item.eventId === input.event.id && item.status !== 'archived')) {
    addMoney(totalByCurrency, expense.currency, expense.amount);
  }
  const byTag = debtByTag(eventEntries, { eventId: input.event.id, includeRejectedDisputed: false });
  const byMember = debtByMember(eventEntries, input.members, input.sharedEventMembers, { eventId: input.event.id });
  const byPayer = new Map<string, MoneyMap>();
  for (const expense of input.sharedExpenses.filter((item) => item.eventId === input.event.id && item.status !== 'archived')) {
    for (const payer of expense.expensePayers) {
      const map = byPayer.get(payer.eventMemberId) ?? {};
      addMoney(map, payer.currency, payer.amountPaid);
      byPayer.set(payer.eventMemberId, map);
    }
  }
  return {
    totalByCurrency,
    byTag,
    byMember,
    byPayer: Array.from(byPayer.entries()).map(([participantId, totalsByCurrency]) => ({
      participantId,
      name: participantName(participantId, input.members, input.sharedEventMembers),
      totalsByCurrency,
    })),
    paidVsUnpaid: paidVsUnpaidSummary(eventEntries),
    verifiedVsPending: verifiedVsPendingSummary(eventEntries),
  };
}

export function estimateForChart(map: MoneyMap, settings: AppSettings, rates: CurrencyRate[]) {
  const estimate = estimateMoneyMap(map, settings, rates);
  return { amount: estimate, currency: settings.baseCurrency, approximate: true };
}

export function recentPaymentsSummary(payments: Payment[], settlements: Settlement[]) {
  const settlementByPayment = new Map<string, Settlement>();
  for (const settlement of settlements) {
    if (settlement.id) {
      settlementByPayment.set(settlement.id, settlement);
    }
  }
  return payments.slice(0, 5).map((payment) => ({
    payment,
    settlement: settlementByPayment.get(payment.id),
  }));
}
