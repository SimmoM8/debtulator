import type {
  DebtFilters,
  Event,
  EventFilters,
  EventParticipant,
  LedgerEntry,
  Member,
  MemberFilters,
  MoneyMap,
  SharedEventMember,
  Attachment,
  Comment,
  SmartSuggestion,
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
  sharedEventMembers: SharedEventMember[] = [],
  stage5?: {
    attachments?: Attachment[];
    comments?: Comment[];
    smartSuggestions?: SmartSuggestion[];
  },
) {
  const query = normalizeText(filters.query);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const sharedMemberById = new Map(sharedEventMembers.map((member) => [member.id, member]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const minAmount = Number(filters.minAmount);
  const maxAmount = Number(filters.maxAmount);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const soonDate = soon.toISOString().slice(0, 10);

  const filtered = entries.filter((entry) => {
    const memberNames = [entry.fromId, entry.toId]
      .filter((id) => id !== 'me')
      .map((id) => memberById.get(id)?.displayName ?? sharedMemberById.get(id)?.displayName ?? '')
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
    const involvedMembers = [entry.fromId, entry.toId]
      .filter((id) => id !== 'me')
      .map((id) => memberById.get(id))
      .filter(Boolean);
    const involvedSharedMembers = [entry.fromId, entry.toId]
      .filter((id) => id !== 'me')
      .map((id) => sharedMemberById.get(id))
      .filter(Boolean);
    const hasLinkedMember =
      involvedMembers.some((member) => member?.linkStatus === 'linked') ||
      involvedSharedMembers.some((member) => member?.type === 'linked_user');
    const linkMatch =
      filters.linkMode === 'all' ||
      (filters.linkMode === 'linked' && hasLinkedMember) ||
      (filters.linkMode === 'unlinked' && !hasLinkedMember);
    const visibilityMatch = filters.visibility === 'all' || entry.visibility === filters.visibility;
    const tagMatch = !filters.tag || entry.tags.includes(filters.tag);
    const kindMatch = filters.kind === 'all' || entry.kind === filters.kind;
    const paymentMatch = filters.paymentStatus === 'all' || entry.paymentStatus === filters.paymentStatus;
    const dueMatch =
      filters.dueMode === 'all' ||
      (filters.dueMode === 'no_due_date' && !entry.dueDate) ||
      (filters.dueMode === 'overdue' && Boolean(entry.dueDate && entry.dueDate < today && entry.remainingAmount > 0.005)) ||
      (filters.dueMode === 'due_soon' && Boolean(entry.dueDate && entry.dueDate >= today && entry.dueDate <= soonDate));
    const amountMatch =
      (!Number.isFinite(minAmount) || entry.amount >= minAmount) &&
      (!Number.isFinite(maxAmount) || entry.amount <= maxAmount);
    const directionMatch =
      filters.direction === 'all' ||
      (filters.direction === 'they_owe_me' && entry.toId === 'me') ||
      (filters.direction === 'i_owe_them' && entry.fromId === 'me');
    const targetIds = [entry.sourceId, entry.expenseId].filter(Boolean);
    const targetAttachments = (stage5?.attachments ?? []).filter(
      (attachment) => !attachment.archivedAt && targetIds.includes(attachment.targetId),
    );
    const attachmentMatch =
      filters.attachmentMode === 'all' ||
      (filters.attachmentMode === 'has_attachment' && targetAttachments.length > 0) ||
      (filters.attachmentMode === 'has_receipt' && targetAttachments.some((attachment) => attachment.attachmentKind === 'receipt')) ||
      (filters.attachmentMode === 'has_proof' && targetAttachments.some((attachment) => attachment.attachmentKind === 'proof')) ||
      (filters.attachmentMode === 'none' && targetAttachments.length === 0);
    const targetComments = (stage5?.comments ?? []).filter(
      (comment) => !comment.deletedAt && targetIds.includes(comment.targetId),
    );
    const commentMatch =
      filters.commentMode === 'all' ||
      (filters.commentMode === 'has_comments' && targetComments.length > 0) ||
      (filters.commentMode === 'none' && targetComments.length === 0);
    const suggestionMatch =
      filters.suggestionMode === 'all' ||
      (stage5?.smartSuggestions ?? []).some(
        (suggestion) => suggestion.status === 'active' && targetIds.includes(suggestion.targetId ?? ''),
      );

    return (
      textMatch &&
      memberMatch &&
      eventMatch &&
      currencyMatch &&
      statusMatch &&
      verificationMatch &&
      linkMatch &&
      visibilityMatch &&
      tagMatch &&
      kindMatch &&
      paymentMatch &&
      dueMatch &&
      amountMatch &&
      directionMatch &&
      attachmentMatch &&
      commentMatch &&
      suggestionMatch
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
      case 'due_date':
        return (first.dueDate ?? '9999-12-31').localeCompare(second.dueDate ?? '9999-12-31');
      case 'remaining_amount':
        return second.remainingAmount - first.remainingAmount;
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
  context?: {
    participants?: EventParticipant[];
    userId?: string | null;
    pendingInviteEventIds?: Set<string>;
    rejectedOrDisputedEventIds?: Set<string>;
    unsettledEventIds?: Set<string>;
  },
) {
  const query = normalizeText(filters.query);

  const filtered = events.filter((event) => {
    const textMatch = !query || normalizeText([event.name, event.notes, event.tags.join(' ')].join(' ')).includes(query);
    const statusMatch = filters.status === 'all' || event.status === filters.status;
    const visibilityMatch = filters.visibility === 'all' || event.visibility === filters.visibility;
    const role =
      context?.participants?.find(
        (participant) => participant.eventId === event.id && participant.userId === context.userId && participant.status === 'active',
      )?.role ?? (event.ownerUserId && context?.userId === event.ownerUserId ? 'owner' : event.visibility === 'private' ? 'owner' : 'viewer');
    const roleMatch = filters.role === 'all' || role === filters.role;
    const attentionMatch =
      filters.attention === 'all' ||
      (filters.attention === 'pending_invites' && context?.pendingInviteEventIds?.has(event.id)) ||
      (filters.attention === 'rejected_or_disputed' && context?.rejectedOrDisputedEventIds?.has(event.id)) ||
      (filters.attention === 'unsettled' && context?.unsettledEventIds?.has(event.id));
    const tagMatch = !filters.tag || event.tags.includes(filters.tag);
    const archivedMatch =
      filters.archivedMode === 'all' ||
      (filters.archivedMode === 'active' && !event.archived) ||
      (filters.archivedMode === 'archived' && event.archived);
    const currencyMatch = filters.currency === 'all' || event.defaultCurrency === filters.currency;

    return textMatch && statusMatch && visibilityMatch && roleMatch && attentionMatch && tagMatch && archivedMatch && currencyMatch;
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
