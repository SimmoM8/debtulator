import { isDueSoon } from "@/src/features/debts/utils/isDueSoon";
import type { Debt } from "./Debt";
import type { DebtListItem } from "./DebtListItem";

import type { Member } from "@/src/features/members/model/Member";

export type DebtsScreenModel = {
  youOwe: number;
  theyOwe: number;
  youOweCount: number;
  theyOweCount: number;
  netBalance: number;
  items: DebtListItem[];
};

export function buildDebtsScreenModel(
  debts: Debt[],
  members: Member[],
): DebtsScreenModel {
  const memberNames = new Map(
    members.map((member) => [member.id, member.displayName]),
  );

  let youOwe = 0;
  let theyOwe = 0;

  for (const debt of debts) {
    if (debt.direction === "you_owe") {
      youOwe += debt.amount;
    } else {
      theyOwe += debt.amount;
    }
  }

  return {
    youOwe,
    theyOwe,
    youOweCount: debts.filter((debt) => debt.direction === "you_owe").length,
    theyOweCount: debts.filter((debt) => debt.direction === "they_owe").length,
    netBalance: theyOwe - youOwe,

    items: debts.map((debt) => ({
      id: debt.id,
      title: debt.title,
      person: memberNames.get(debt.memberId) ?? "Unknown member",
      amount: debt.amount,
      direction: debt.direction,
      date: debt.createdAt,
      dueDate: debt.dueDate,
      dueSoon: isDueSoon(debt.dueDate),
    })),
  };
}
