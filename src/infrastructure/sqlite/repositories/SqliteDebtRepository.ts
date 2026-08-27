import type { Debt } from "@/src/domain/debts/Debt";
import type { DebtRepository } from "@/src/domain/debts/DebtRepository";

import type { DebtulatorDatabase } from "../database/types";
import { mapDebtRow } from "../mappers/debtMapper";
import type { DebtRow } from "../rows/DebtRow";

export class SqliteDebtRepository implements DebtRepository {
  constructor(private readonly db: DebtulatorDatabase) {}

  async getAllByOwner(ownerUserId: string): Promise<Debt[]> {
    const rows = await this.db.getAllAsync<DebtRow>(
      `
        SELECT
          id,
          owner_user_id,
          member_id,
          direction,
          amount,
          currency,
          title,
          due_date,
          created_at,
          updated_at
        FROM debts
        WHERE owner_user_id = ?
        ORDER BY created_at DESC
      `,
      [ownerUserId],
    );

    return rows.map(mapDebtRow);
  }

  async getById(
    ownerUserId: string,
    debtId: string,
  ): Promise<Debt | null> {
    const row = await this.db.getFirstAsync<DebtRow>(
      `
        SELECT
          id,
          owner_user_id,
          member_id,
          direction,
          amount,
          currency,
          title,
          due_date,
          created_at,
          updated_at
        FROM debts
        WHERE owner_user_id = ?
          AND id = ?
        LIMIT 1
      `,
      [ownerUserId, debtId],
    );

    return row ? mapDebtRow(row) : null;
  }

  async save(debt: Debt): Promise<void> {
    await this.db.runAsync(
      `
        INSERT INTO debts (
          id,
          owner_user_id,
          member_id,
          direction,
          amount,
          currency,
          title,
          due_date,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          owner_user_id = excluded.owner_user_id,
          member_id = excluded.member_id,
          direction = excluded.direction,
          amount = excluded.amount,
          currency = excluded.currency,
          title = excluded.title,
          due_date = excluded.due_date,
          updated_at = excluded.updated_at
      `,
      [
        debt.id,
        debt.ownerUserId,
        debt.memberId,
        debt.direction,
        debt.amount,
        debt.currency,
        debt.title,
        debt.dueDate,
        debt.createdAt,
        debt.updatedAt,
      ],
    );
  }

  async delete(ownerUserId: string, debtId: string): Promise<void> {
    await this.db.runAsync(
      `
        DELETE FROM debts
        WHERE owner_user_id = ?
          AND id = ?
      `,
      [ownerUserId, debtId],
    );
  }
}
