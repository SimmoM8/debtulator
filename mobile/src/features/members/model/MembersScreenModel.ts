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

export function buildMembersScreenModel(members: Member[]): MembersScreenModel {
  const items = members.map<MemberListItem>((member) => ({
    id: member.id,
    displayName: member.displayName,
    linkStatus: member.linkedUserId === null ? "non_linked" : "linked",
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
