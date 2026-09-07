import { isDueSoon } from "@/src/features/debts/utils/isDueSoon";
import type { Member } from "@/src/features/members/model/Member";

import type { Debt } from "./Debt";
import {
  buildDebtBalanceSummary,
  type DebtBalanceSummary,
} from "./DebtBalanceSummary";
import type { DebtListItem } from "./DebtListItem";

export type DebtsScreenModel = DebtBalanceSummary & {
  items: DebtListItem[];
};

export function buildDebtsScreenModel(
  debts: Debt[],
  members: Member[],
): DebtsScreenModel {
  const memberNames = new Map(
    members.map((member) => [member.id, member.displayName]),
  );

  return {
    ...buildDebtBalanceSummary(debts),

    items: debts.map((debt) => ({
      id: debt.id,
      title: debt.title ?? "Untitled debt",
      person: memberNames.get(debt.memberId) ?? "Unknown member",
      amount: debt.amount,
      direction: debt.direction,
      date: debt.createdAt,
      dueDate: debt.dueDate,
      dueSoon: isDueSoon(debt.dueDate),
    })),
  };
}
