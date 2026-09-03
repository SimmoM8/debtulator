import { router } from "expo-router";

export type OpenLinkMemberInput = {
  memberId: string;
};

export function openLinkMember(input: OpenLinkMemberInput): void {
  const memberId = input.memberId.trim();

  if (!memberId) {
    return;
  }

  router.push({
    pathname: "/(main)/(modals)/member/link",
    params: {
      memberId,
    },
  });
}
