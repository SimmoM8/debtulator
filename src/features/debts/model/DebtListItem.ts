import type { DebtDirection } from "./Debt";

export type DebtListItem = {
  id: string;
  title: string;
  person: string;
  amount: number;
  direction: DebtDirection;
  date: string;
  dueDate: string | null;
  dueSoon: boolean;
};
