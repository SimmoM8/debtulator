export const DEBT_DIRECTIONS = ["you_owe", "they_owe"] as const;

export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export type Debt = {
  id: string;
  ownerUserId: string;
  memberId: string;
  direction: DebtDirection;
  amount: number;
  currency: string;
  title: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
