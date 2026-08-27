import type { Debt } from "./Debt";

export interface DebtRepository {
  getAllByOwner(ownerUserId: string): Promise<Debt[]>;
  getById(ownerUserId: string, debtId: string): Promise<Debt | null>;
  save(debt: Debt): Promise<void>;
  delete(ownerUserId: string, debtId: string): Promise<void>;
}
