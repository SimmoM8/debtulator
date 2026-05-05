import type {
  DebtFilters,
  Event,
  EventFilters,
  LedgerEntry,
  Member,
  MemberFilters,
  MoneyMap,
} from '@/src/types/models';
import { sumMoneyMap } from '@/src/utils/money';
import { normalizeText } from '@/src/utils/text';

export function filterMembers(members: Member[], balances: Record<string, MoneyMap>, filters: MemberFilters) {
  const query = normalizeText(filters.query);

  const filtered = members.filter((member) => {
    const activeMatch =
      filters.archivedMode === 'all' ||
      (filters.archivedMode === 'active' && !member.archived) ||
      (filters.archivedMode === 'archived' && member.archived);
    const tagMatch = !filters.tag || member.tags.includes(filters.tag);
    const textMatch =
      !query ||
      normalizeText([member.displayName, member.notes, member.email, member.phone, member.tags.join(' ')].join(' ')).includes(query);
    const balanceMatch = filters.balanceMode === 'all' || sumMoneyMap(balances[member.id] ?? {}) > 0.005;

    return activeMatch && tagMatch && textMatch && balanceMatch;
  });

  return filtered.sort((first, second) => {
    if (filters.sort === 'balance_desc') {
      return sumMoneyMap(balances[second.id] ?? {}) - sumMoneyMap(balances[first.id] ?? {});
    }
    return first.displayName.localeCompare(second.displayName);
  });
}

export function filterDebtEntries(
  entries: LedgerEntry[],
  members: Member[],
  events: Event[],
  filters: DebtFilters,
) {
  const query = normalizeText(filters.query);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const minAmount = Number(filters.minAmount);
  const maxAmount = Number(filters.maxAmount);

  const filtered = entries.filter((entry) => {
    const memberNames = [entry.fromId, entry.toId]
      .filter((id) => id !== 'me')
      .map((id) => memberById.get(id)?.displayName ?? '')
      .join(' ');
    const eventName = entry.eventId ? eventById.get(entry.eventId)?.name ?? '' : '';
    const text = normalizeText([entry.title, entry.notes, memberNames, eventName, entry.tags.join(' ')].join(' '));
    const textMatch = !query || text.includes(query);
    const memberMatch =
      !filters.memberId || entry.fromId === filters.memberId || entry.toId === filters.memberId;
    const eventMatch = !filters.eventId || entry.eventId === filters.eventId;
    const currencyMatch = filters.currency === 'all' || entry.currency === filters.currency;
    const statusMatch = filters.status === 'all' || entry.status === filters.status;
    const verificationMatch =
      filters.verificationStatus === 'all' || entry.verificationStatus === filters.verificationStatus;
    const tagMatch = !filters.tag || entry.tags.includes(filters.tag);
    const kindMatch = filters.kind === 'all' || entry.kind === filters.kind;
    const amountMatch =
      (!Number.isFinite(minAmount) || entry.amount >= minAmount) &&
      (!Number.isFinite(maxAmount) || entry.amount <= maxAmount);
    const directionMatch =
      filters.direction === 'all' ||
      (filters.direction === 'they_owe_me' && entry.toId === 'me') ||
      (filters.direction === 'i_owe_them' && entry.fromId === 'me');

    return (
      textMatch &&
      memberMatch &&
      eventMatch &&
      currencyMatch &&
      statusMatch &&
      verificationMatch &&
      tagMatch &&
      kindMatch &&
      amountMatch &&
      directionMatch
    );
  });

  return filtered.sort((first, second) => {
    switch (filters.sort) {
      case 'date_asc':
        return first.date.localeCompare(second.date);
      case 'amount_desc':
        return second.amount - first.amount;
      case 'amount_asc':
        return first.amount - second.amount;
      case 'name_asc':
        return first.title.localeCompare(second.title);
      case 'date_desc':
      default:
        return second.date.localeCompare(first.date);
    }
  });
}

export function filterEvents(
  events: Event[],
  eventBalances: Record<string, MoneyMap>,
  filters: EventFilters,
) {
  const query = normalizeText(filters.query);

  const filtered = events.filter((event) => {
    const textMatch = !query || normalizeText([event.name, event.notes, event.tags.join(' ')].join(' ')).includes(query);
    const statusMatch = filters.status === 'all' || event.status === filters.status;
    const tagMatch = !filters.tag || event.tags.includes(filters.tag);
    const archivedMatch =
      filters.archivedMode === 'all' ||
      (filters.archivedMode === 'active' && !event.archived) ||
      (filters.archivedMode === 'archived' && event.archived);
    const currencyMatch = filters.currency === 'all' || event.defaultCurrency === filters.currency;

    return textMatch && statusMatch && tagMatch && archivedMatch && currencyMatch;
  });

  return filtered.sort((first, second) => {
    switch (filters.sort) {
      case 'balance_desc':
        return sumMoneyMap(eventBalances[second.id] ?? {}) - sumMoneyMap(eventBalances[first.id] ?? {});
      case 'name_asc':
        return first.name.localeCompare(second.name);
      case 'date_asc':
        return first.updatedAt.localeCompare(second.updatedAt);
      case 'date_desc':
      default:
        return second.updatedAt.localeCompare(first.updatedAt);
    }
  });
}
