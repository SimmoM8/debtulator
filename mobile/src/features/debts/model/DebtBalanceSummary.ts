import type { Debt } from "./Debt";

export type DebtBalanceSummary = {
  youOwe: number;
  theyOwe: number;

  youOweCount: number;
  theyOweCount: number;

  netBalance: number;
};

export function buildDebtBalanceSummary(
  debts: readonly Debt[],
): DebtBalanceSummary {
  let youOwe = 0;
  let theyOwe = 0;

  let youOweCount = 0;
  let theyOweCount = 0;

  for (const debt of debts) {
    if (debt.direction === "you_owe") {
      youOwe += debt.amount;
      youOweCount += 1;
    } else {
      theyOwe += debt.amount;
      theyOweCount += 1;
    }
  }

  return {
    youOwe,
    theyOwe,

    youOweCount,
    theyOweCount,

    netBalance: theyOwe - youOwe,
  };
}
