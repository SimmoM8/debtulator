import type { DuplicateWarning, Group, GroupMember, Member } from '@/src/types/models';
import { compactPhone, normalizeText } from '@/src/utils/text';

export function findDuplicateWarnings(group: Group, groupMembers: GroupMember[], members: Member[]) {
  const memberIds = groupMembers
    .filter((groupMember) => groupMember.groupId === group.id)
    .map((groupMember) => groupMember.memberId);
  const groupMemberRecords = members.filter((member) => memberIds.includes(member.id));
  const warnings: DuplicateWarning[] = [];

  for (let outerIndex = 0; outerIndex < groupMemberRecords.length; outerIndex += 1) {
    for (let innerIndex = outerIndex + 1; innerIndex < groupMemberRecords.length; innerIndex += 1) {
      const first = groupMemberRecords[outerIndex];
      const second = groupMemberRecords[innerIndex];
      const warning = compareMembers(group.id, first, second);

      if (warning && !group.ignoredDuplicateKeys.includes(warning.key)) {
        warnings.push(warning);
      }
    }
  }

  return warnings;
}

function compareMembers(groupId: string, first: Member, second: Member): DuplicateWarning | null {
  const firstName = normalizeText(first.displayName);
  const secondName = normalizeText(second.displayName);
  const firstEmail = first.email?.trim().toLowerCase();
  const secondEmail = second.email?.trim().toLowerCase();
  const firstPhone = compactPhone(first.phone);
  const secondPhone = compactPhone(second.phone);

  if (firstEmail && secondEmail && firstEmail === secondEmail) {
    return warning(groupId, first, second, 'same_email');
  }

  if (firstPhone && secondPhone && firstPhone === secondPhone) {
    return warning(groupId, first, second, 'same_phone');
  }

  if (firstName && firstName === secondName) {
    return warning(groupId, first, second, 'same_name');
  }

  if (isSimilarName(firstName, secondName)) {
    return warning(groupId, first, second, 'similar_name');
  }

  return null;
}

function warning(
  groupId: string,
  first: Member,
  second: Member,
  reason: DuplicateWarning['reason'],
): DuplicateWarning {
  return {
    key: [groupId, first.id, second.id, reason].join(':'),
    groupId,
    memberAId: first.id,
    memberBId: second.id,
    reason,
    message: `Possible duplicate members detected: ${first.displayName} and ${second.displayName} may refer to the same person.`,
  };
}

function isSimilarName(firstName: string, secondName: string) {
  if (!firstName || !secondName) {
    return false;
  }

  if (firstName.includes(secondName) || secondName.includes(firstName)) {
    return true;
  }

  return levenshtein(firstName, secondName) <= 2;
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
