import type { CurrencyCode } from "@/src/domain/currencies/Currency";
import type { Debt, DebtDirection } from "@/src/domain/debts/Debt";
import type { DebtRepository } from "@/src/domain/debts/DebtRepository";

export type CreateDebtInput = {
  ownerUserId: string;
  memberId: string;
  direction: DebtDirection;
  amount: number;
  currency: CurrencyCode;
  title: string;
  dueDate: string | null;
};

export async function createDebt(
  repository: DebtRepository,
  input: CreateDebtInput,
): Promise<Debt> {
  const title = input.title.trim();

  if (!title) throw new Error("Debt title is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Debt amount must be greater than zero.");
  }

  const now = new Date().toISOString();

  const debt: Debt = {
    id: crypto.randomUUID(),
    ownerUserId: input.ownerUserId,
    memberId: input.memberId,
    direction: input.direction,
    amount: input.amount,
    currency: input.currency,
    title,
    dueDate: input.dueDate,
    createdAt: now,
    updatedAt: now,
  };

  await repository.save(debt);
  return debt;
}
