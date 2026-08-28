import type { CurrencyCode } from "@/src/domain/currencies/Currency";
import type { Debt, DebtDirection } from "@/src/domain/debts/Debt";
import type { Member } from "@/src/domain/members/Member";
import type { MoneyMap } from "@/src/domain/money/Money";
import { isDueSoon } from "@/src/domain/shared/dates";

export type DebtListItemModel = {
  id: string;
  title: string;
  person: string;
  amount: number;
  currency: CurrencyCode;
  direction: DebtDirection;
  date: string;
  dueDate: string | null;
  dueSoon: boolean;
};

export type DebtsScreenModel = {
  youOwe: MoneyMap;
  theyOwe: MoneyMap;
  youOweCount: number;
  theyOweCount: number;
  netBalance: MoneyMap;
  items: DebtListItemModel[];
};

function addAmount(map: MoneyMap, currency: CurrencyCode, amount: number) {
  map[currency] = (map[currency] ?? 0) + amount;
}

export function buildDebtsScreenModel(input: {
  debts: Debt[];
  members: Member[];
}): DebtsScreenModel {
  const membersById = new Map(
    input.members.map((member) => [member.id, member]),
  );

  const youOwe: MoneyMap = {};
  const theyOwe: MoneyMap = {};
  const netBalance: MoneyMap = {};

  for (const debt of input.debts) {
    if (debt.direction === "you_owe") {
      addAmount(youOwe, debt.currency, debt.amount);
      addAmount(netBalance, debt.currency, -debt.amount);
    } else {
      addAmount(theyOwe, debt.currency, debt.amount);
      addAmount(netBalance, debt.currency, debt.amount);
    }
  }

  const items: DebtListItemModel[] = input.debts
    .map((debt) => ({
      id: debt.id,
      title: debt.title,
      person: membersById.get(debt.memberId)?.displayName ?? "Unknown member",
      amount: debt.amount,
      currency: debt.currency,
      direction: debt.direction,
      date: debt.createdAt,
      dueDate: debt.dueDate,
      dueSoon: isDueSoon(debt.dueDate),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    youOwe,
    theyOwe,
    youOweCount: input.debts.filter((debt) => debt.direction === "you_owe")
      .length,
    theyOweCount: input.debts.filter((debt) => debt.direction === "they_owe")
      .length,
    netBalance,
    items,
  };
}
