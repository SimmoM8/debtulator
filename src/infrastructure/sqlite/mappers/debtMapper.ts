import {
  CURRENCY_CODES,
  type CurrencyCode,
} from "@/src/domain/currencies/Currency";
import {
  DEBT_DIRECTIONS,
  type Debt,
  type DebtDirection,
} from "@/src/domain/debts/Debt";

import type { DebtRow } from "../rows/DebtRow";

function isDebtDirection(value: string): value is DebtDirection {
  return DEBT_DIRECTIONS.some((direction) => direction === value);
}

function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.some((currency) => currency === value);
}

export function mapDebtRow(row: DebtRow): Debt {
  if (!isDebtDirection(row.direction)) {
    throw new Error(
      `Invalid debt direction stored in SQLite: ${row.direction}`,
    );
  }

  if (!isCurrencyCode(row.currency)) {
    throw new Error(
      `Invalid currency code stored in SQLite: ${row.currency}`,
    );
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
