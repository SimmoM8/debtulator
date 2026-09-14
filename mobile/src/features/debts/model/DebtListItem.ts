import type { Money } from "@/src/features/currencies/model/Money";

import type { DebtAgreementStatus, DebtDirection } from "./Debt";

export type DebtListItem = {
  id: string;
  title: string;
  person: string;
  money: Money;
  direction: DebtDirection;
  agreementStatus: DebtAgreementStatus;
  date: string;
  dueDate: string | null;
  dueSoon: boolean;
};
