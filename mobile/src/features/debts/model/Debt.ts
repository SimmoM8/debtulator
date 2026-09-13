import type { Money } from "@/src/features/currencies/model/Money";

export const DEBT_DIRECTIONS = ["you_owe", "they_owe"] as const;

export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export type Debt = {
  id: string;
  ownerUserId: string;
  memberId: string;
  direction: DebtDirection;
  money: Money;
  title: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  version: number | null;
};
