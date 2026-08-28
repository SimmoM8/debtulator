import type { Debt } from "@/src/domain/debts/Debt";
import type { DebtRepository } from "@/src/domain/debts/DebtRepository";

export function getDebts(
  repository: DebtRepository,
  ownerUserId: string,
): Promise<Debt[]> {
  return repository.getAllByOwner(ownerUserId);
}
