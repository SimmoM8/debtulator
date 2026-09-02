import { router } from "expo-router";

export type OpenNewMemberInput = {
  selectFor?: "debt";
};

export function openNewMember(input: OpenNewMemberInput = {}): void {
  if (input.selectFor === "debt") {
    router.push("/(main)/(modals)/debt/new-member");

    return;
  }

  router.push("/(main)/(modals)/member/new");
}
