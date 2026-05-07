import type {
  Debt,
  Event,
  LedgerEntry,
  Member,
  RecurringTemplate,
  SharedEventMember,
  SmartSuggestion,
} from '@/src/types/models';
import { normalizeText } from '@/src/utils/text';

export type SuggestionDraft = Omit<SmartSuggestion, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  key: string;
  status?: SmartSuggestion['status'];
};

const KEYWORD_TAGS: Record<string, string[]> = {
  food: ['groceries', 'grocery', 'restaurant', 'dinner', 'lunch', 'breakfast', 'coffee', 'pizza', 'meal'],
  transport: ['petrol', 'gas', 'fuel', 'uber', 'taxi', 'train', 'bus', 'parking', 'flight'],
  travel: ['hotel', 'ski', 'trip', 'cabin', 'rental', 'airport', 'flight', 'travel'],
  rent: ['rent', 'utilities', 'electricity', 'internet', 'water'],
  family: ['dad', 'mum', 'mom', 'family', 'gift', 'christmas'],
};

export function suggestTags(input: {
  title: string;
  notes?: string | null;
  member?: Member | null;
  event?: Event | null;
  previousEntries?: LedgerEntry[];
  existingTags: string[];
}) {
  const text = normalizeText(`${input.title} ${input.notes ?? ''} ${input.event?.name ?? ''}`);
  const suggestions = new Set<string>();
  for (const [tag, keywords] of Object.entries(KEYWORD_TAGS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      suggestions.add(titleCase(tag));
    }
  }
  input.member?.tags.forEach((tag) => suggestions.add(tag));
  input.event?.tags.forEach((tag) => suggestions.add(tag));
  input.previousEntries
    ?.filter((entry) => normalizeText(entry.title).includes(normalizeText(input.title).slice(0, 5)))
    .flatMap((entry) => entry.tags)
    .forEach((tag) => suggestions.add(tag));

  return Array.from(suggestions).filter((tag) => !input.existingTags.includes(tag)).slice(0, 5);
}

export function buildSmartSuggestionDrafts(input: {
  debts: Debt[];
  members: Member[];
  events: Event[];
  entries: LedgerEntry[];
  sharedEventMembers: SharedEventMember[];
  recurringTemplates: RecurringTemplate[];
  persisted: SmartSuggestion[];
}) {
  const dismissedKeys = new Set(
    input.persisted
      .filter((suggestion) => suggestion.status === 'dismissed')
      .map((suggestion) => String(suggestion.metadata.key ?? suggestion.id)),
  );
  const drafts: SuggestionDraft[] = [
    ...memberDuplicateSuggestions(input.members),
    ...debtDuplicateSuggestions(input.entries),
    ...eventPatternSuggestions(input.debts, input.events),
    ...recurringSuggestions(input.debts, input.recurringTemplates),
  ];
  return drafts.filter((draft) => !dismissedKeys.has(draft.key));
}

function memberDuplicateSuggestions(members: Member[]): SuggestionDraft[] {
  const suggestions: SuggestionDraft[] = [];
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const first = members[i];
      const second = members[j];
      if (first.archived || second.archived) {
        continue;
      }
      const sameEmail = first.email && second.email && first.email.toLowerCase() === second.email.toLowerCase();
      const samePhone = first.phone && second.phone && first.phone === second.phone;
      const similarName = normalizeText(first.displayName) === normalizeText(second.displayName);
      if (!sameEmail && !samePhone && !similarName) {
        continue;
      }
      const key = `duplicate_member:${[first.id, second.id].sort().join(':')}`;
      suggestions.push({
        key,
        userId: null,
        suggestionType: 'duplicate',
        targetType: 'member',
        targetId: first.id,
        title: 'Possible duplicate member',
        message: `${first.displayName} and ${second.displayName} may refer to the same person. Review before merging or ignoring.`,
        metadata: { key, firstMemberId: first.id, secondMemberId: second.id },
      });
    }
  }
  return suggestions;
}

function debtDuplicateSuggestions(entries: LedgerEntry[]): SuggestionDraft[] {
  const suggestions: SuggestionDraft[] = [];
  const active = entries.filter((entry) => entry.status !== 'archived');
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const first = active[i];
      const second = active[j];
      if (
        first.currency !== second.currency ||
        Math.abs(first.originalAmount - second.originalAmount) > 0.005 ||
        first.date !== second.date ||
        first.eventId !== second.eventId
      ) {
        continue;
      }
      const samePeople = [first.fromId, first.toId].sort().join(':') === [second.fromId, second.toId].sort().join(':');
      const similarTitle =
        normalizeText(first.title).includes(normalizeText(second.title)) ||
        normalizeText(second.title).includes(normalizeText(first.title));
      if (!samePeople || !similarTitle) {
        continue;
      }
      const key = `duplicate_debt:${[first.id, second.id].sort().join(':')}`;
      suggestions.push({
        key,
        userId: null,
        suggestionType: 'duplicate',
        targetType: first.kind === 'simple_debt' ? 'debt' : first.kind === 'event_direct_debt' ? 'event_debt' : 'shared_expense',
        targetId: first.sourceId,
        title: 'Possible duplicate debt',
        message: `${first.title} looks similar to another ${first.currency} ${first.originalAmount} record on ${first.date}.`,
        metadata: { key, firstLedgerId: first.id, secondLedgerId: second.id },
      });
    }
  }
  return suggestions.slice(0, 8);
}

function eventPatternSuggestions(debts: Debt[], events: Event[]): SuggestionDraft[] {
  const suggestions: SuggestionDraft[] = [];
  for (const debt of debts.filter((item) => !item.eventId && item.status === 'active')) {
    const text = normalizeText(`${debt.title} ${debt.notes ?? ''}`);
    const matchingEvent = events.find((event) => !event.archived && text.includes(normalizeText(event.name)));
    if (!matchingEvent) {
      continue;
    }
    const key = `event_match:${debt.id}:${matchingEvent.id}`;
    suggestions.push({
      key,
      userId: null,
      suggestionType: 'event',
      targetType: 'debt',
      targetId: debt.id,
      title: `Add this debt to ${matchingEvent.name}?`,
      message: `The title or notes look related to ${matchingEvent.name}. Nothing changes unless you confirm.`,
      metadata: { key, debtId: debt.id, eventId: matchingEvent.id },
    });
  }
  return suggestions.slice(0, 5);
}

function recurringSuggestions(debts: Debt[], templates: RecurringTemplate[]): SuggestionDraft[] {
  const groups = new Map<string, Debt[]>();
  for (const debt of debts.filter((item) => item.status === 'active' && !item.recurringTemplateId)) {
    const key = [debt.memberId, normalizeText(debt.title), debt.amount, debt.currency].join('|');
    const group = groups.get(key) ?? [];
    group.push(debt);
    groups.set(key, group);
  }
  const existingTemplateKeys = new Set(
    templates.map((template) => [template.memberId, normalizeText(template.title), template.amount, template.currency].join('|')),
  );
  return Array.from(groups.entries())
    .filter(([key, group]) => group.length >= 2 && !existingTemplateKeys.has(key))
    .map<SuggestionDraft>(([key, group]) => ({
      key: `recurring:${key}`,
      userId: null,
      suggestionType: 'recurring',
      targetType: 'debt',
      targetId: group[0].id,
      title: `${group[0].title} appears to repeat`,
      message: `${group.length} similar records were found. Create a recurring debt only if this is intentional.`,
      metadata: { key: `recurring:${key}`, debtIds: group.map((debt) => debt.id) },
    }))
    .slice(0, 5);
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
