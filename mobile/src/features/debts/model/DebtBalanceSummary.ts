import type { Money } from "@/src/features/currencies/model/Money";
import {
  addMoney,
  convertMoney,
  subtractMoney,
  zeroMoney,
} from "@/src/features/currencies/utils/money";

import type { Debt } from "./Debt";

export type DebtBalanceSummary = {
  youOwe: Money;
  theyOwe: Money;
  netBalance: Money;
  youOweCount: number;
  theyOweCount: number;
};

export function buildDebtBalanceSummary(
  debts: readonly Debt[],
  baseCurrencyCode: string,
): DebtBalanceSummary {
  let youOwe = zeroMoney(baseCurrencyCode);
  let theyOwe = zeroMoney(baseCurrencyCode);
  let youOweCount = 0;
  let theyOweCount = 0;

  for (const debt of debts) {
    const converted = convertMoney(debt.money, baseCurrencyCode);

    if (debt.direction === "you_owe") {
      youOwe = addMoney(youOwe, converted);
      youOweCount += 1;
    } else {
      theyOwe = addMoney(theyOwe, converted);
      theyOweCount += 1;
    }
  }

  return {
    youOwe,
    theyOwe,
    netBalance: subtractMoney(theyOwe, youOwe),
    youOweCount,
    theyOweCount,
  };
}
