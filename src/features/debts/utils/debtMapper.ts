import { DEBT_DIRECTIONS, type Debt, type DebtDirection } from "../model/Debt";

import type { DebtRow } from "../data/DebtSqlRow";

function isDebtDirection(value: string): value is DebtDirection {
  return DEBT_DIRECTIONS.some((direction) => direction === value);
}

export function mapDebtRow(row: DebtRow): Debt {
  if (!isDebtDirection(row.direction)) {
    throw new Error(
      `Invalid debt direction stored in SQLite: ${row.direction}`,
    );
  }

  if (row.currency !== "SEK") {
    throw new Error(`Unsupported debt currency: ${row.currency}`);
  }

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    memberId: row.member_id,
    direction: row.direction,
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
