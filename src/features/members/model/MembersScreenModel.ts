import type { Member } from "./Member";

export type MemberLinkStatus = "linked" | "non_linked";

export type MemberListItem = {
  id: string;
  displayName: string;
  linkStatus: MemberLinkStatus;
};

export type MembersScreenModel = {
  totalCount: number;
  linkedCount: number;
  nonLinkedCount: number;
  items: MemberListItem[];
};

const NO_LINKED_MEMBERS: ReadonlySet<string> = new Set();

export function buildMembersScreenModel(
  members: Member[],
  linkedMemberIds: ReadonlySet<string> = NO_LINKED_MEMBERS,
): MembersScreenModel {
  const items = members.map<MemberListItem>((member) => ({
    id: member.id,
    displayName: member.displayName,
    linkStatus: linkedMemberIds.has(member.id) ? "linked" : "non_linked",
  }));

  const linkedCount = items.filter(
    (item) => item.linkStatus === "linked",
  ).length;

  return {
    totalCount: items.length,
    linkedCount,
    nonLinkedCount: items.length - linkedCount,
    items,
  };
}
