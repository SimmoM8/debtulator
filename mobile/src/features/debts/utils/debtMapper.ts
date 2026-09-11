import type { DebtSqlRow } from "@/src/features/debts/data/DebtSqlRow";
import type {
  Debt,
  DebtDirection,
} from "@/src/features/debts/model/Debt";

export function mapDebtRow(row: DebtSqlRow): Debt {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    memberId: row.member_id,
    direction: requireDirection(row.direction),
    amount: row.amount,
    currency: row.currency,
    title: row.title,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

export function debtToCreateSyncPayload(
  debt: Debt,
): Record<string, unknown> {
  return {
    memberId: debt.memberId,
    direction: debt.direction,
    amount: debt.amount.toString(),
    currency: debt.currency,
    title: debt.title,
    dueDate: debt.dueDate,
    createdAt: debt.createdAt,
  };
}

export function syncPayloadToDebt(
  value: Record<string, unknown>,
): Debt {
  return {
    id: requireString(value.id, "id"),
    ownerUserId: requireString(value.ownerUserId, "ownerUserId"),
    memberId: requireString(value.memberId, "memberId"),
    direction: requireDirection(requireString(value.direction, "direction")),
    amount: requireAmount(value.amount),
    currency: requireString(value.currency, "currency"),
    title: requireString(value.title, "title"),
    dueDate:
      value.dueDate === null
        ? null
        : requireString(value.dueDate, "dueDate"),
    createdAt: requireString(value.createdAt, "createdAt"),
    updatedAt: requireString(value.updatedAt, "updatedAt"),
    version: requireVersion(value.version),
  };
}

function requireDirection(value: string): DebtDirection {
  if (value !== "you_owe" && value !== "they_owe") {
    throw new Error(`Invalid debt direction '${value}'.`);
  }

  return value;
}

function requireAmount(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Invalid debt sync amount.");
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid debt sync amount.");
  }

  return amount;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid debt sync field '${field}'.`);
  }

  return value;
}

function requireVersion(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error("Invalid debt sync version.");
  }

  return value;
}
