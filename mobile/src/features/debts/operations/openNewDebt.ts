import { router } from "expo-router";

export type OpenNewDebtInput = {
  memberId?: string;
};

export function openNewDebt(input: OpenNewDebtInput = {}): void {
  const memberId = input.memberId?.trim();

  if (memberId) {
    router.push({
      pathname: "/(main)/(modals)/debt/new",
      params: {
        memberId,
      },
    });

    return;
  }

  router.push("/(main)/(modals)/debt/select-member");
}
