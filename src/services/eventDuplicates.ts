import type {
  EventDuplicateWarning,
  EventDuplicateWarningConfidence,
  SharedEventMember,
  SyncStatus,
} from '@/src/types/models';
import { createId, nowIso } from '@/src/utils/id';
import { compactPhone, normalizeText } from '@/src/utils/text';

type WarningDraft = Omit<EventDuplicateWarning, 'id' | 'remoteId' | 'createdAt' | 'updatedAt' | 'syncStatus'>;

export function findSharedEventDuplicateWarningDrafts(
  eventId: string,
  members: SharedEventMember[],
): WarningDraft[] {
  const activeUnlinked = members.filter(
    (member) =>
      member.eventId === eventId &&
      member.type === 'unlinked_placeholder' &&
      member.status !== 'archived' &&
      member.status !== 'merged',
  );
  const warnings: WarningDraft[] = [];

  for (let outerIndex = 0; outerIndex < activeUnlinked.length; outerIndex += 1) {
    for (let innerIndex = outerIndex + 1; innerIndex < activeUnlinked.length; innerIndex += 1) {
      const first = activeUnlinked[outerIndex];
      const second = activeUnlinked[innerIndex];
      const warning = compareSharedEventMembers(eventId, first, second);
      if (warning) {
        warnings.push(warning);
      }
    }
  }

  return warnings;
}

export function buildDuplicateWarning(
  draft: WarningDraft,
  existing?: EventDuplicateWarning,
  syncStatus: SyncStatus = 'pending_upload',
): EventDuplicateWarning {
  const timestamp = nowIso();
  return {
    ...draft,
    id: existing?.id ?? createId('event_duplicate'),
    remoteId: existing?.remoteId ?? null,
    status: existing?.status ?? draft.status,
    ignoredByUserId: existing?.ignoredByUserId ?? draft.ignoredByUserId,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    syncStatus: existing?.remoteId ? 'pending_update' : existing?.syncStatus ?? syncStatus,
  };
}

export function duplicatePairKey(input: {
  eventId: string;
  eventMemberIdA: string;
  eventMemberIdB: string;
  reason: string;
}) {
  return [input.eventId, ...[input.eventMemberIdA, input.eventMemberIdB].sort(), input.reason].join(':');
}

function compareSharedEventMembers(
  eventId: string,
  first: SharedEventMember,
  second: SharedEventMember,
): WarningDraft | null {
  const firstName = normalizeText(first.displayName);
  const secondName = normalizeText(second.displayName);
  const firstEmail = first.email?.trim().toLowerCase();
  const secondEmail = second.email?.trim().toLowerCase();
  const firstPhone = compactPhone(first.phone);
  const secondPhone = compactPhone(second.phone);

  if (firstEmail && secondEmail && firstEmail === secondEmail) {
    return warning(eventId, first, second, 'Same email address.', 'high');
  }

  if (firstPhone && secondPhone && firstPhone === secondPhone) {
    return warning(eventId, first, second, 'Same phone number.', 'high');
  }

  if (firstName && firstName === secondName) {
    return warning(eventId, first, second, 'Same normalised name.', 'high');
  }

  if (hasSimilarName(firstName, secondName)) {
    return warning(eventId, first, second, 'Names are very similar.', 'medium');
  }

  if (hasSimilarInitials(firstName, secondName)) {
    return warning(eventId, first, second, 'Initials and name shape look similar.', 'low');
  }

  return null;
}

function warning(
  eventId: string,
  first: SharedEventMember,
  second: SharedEventMember,
  reason: string,
  confidence: EventDuplicateWarningConfidence,
): WarningDraft {
  return {
    eventId,
    eventMemberIdA: first.id < second.id ? first.id : second.id,
    eventMemberIdB: first.id < second.id ? second.id : first.id,
    reason,
    confidence,
    status: 'active',
    ignoredByUserId: null,
  };
}

function hasSimilarName(firstName: string, secondName: string) {
  if (!firstName || !secondName) {
    return false;
  }

  if (firstName.includes(secondName) || secondName.includes(firstName)) {
    return true;
  }

  return levenshtein(firstName, secondName) <= 2;
}

function hasSimilarInitials(firstName: string, secondName: string) {
  const firstParts = firstName.split(' ').filter(Boolean);
  const secondParts = secondName.split(' ').filter(Boolean);
  if (firstParts.length < 2 || secondParts.length < 2) {
    return false;
  }
  const firstInitials = firstParts.map((part) => part[0]).join('');
  const secondInitials = secondParts.map((part) => part[0]).join('');
  return firstInitials === secondInitials && hasSimilarName(firstParts.at(-1) ?? '', secondParts.at(-1) ?? '');
}

function levenshtein(first: string, second: string) {
  const dp = Array.from({ length: first.length + 1 }, () => Array(second.length + 1).fill(0));

  for (let i = 0; i <= first.length; i += 1) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= second.length; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[first.length][second.length];
}
