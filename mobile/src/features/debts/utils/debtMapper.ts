import type { DebtSqlRow } from "@/src/features/debts/data/DebtSqlRow";
import type { Debt, DebtDirection } from "@/src/features/debts/model/Debt";
import { createMoney } from "@/src/features/currencies/utils/money";

export function mapDebtRow(row: DebtSqlRow): Debt {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    memberId: row.member_id,
    direction: requireDirection(row.direction),
    money: createMoney(row.amount, row.currency_code),
    title: row.title,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agreementStatus: requireAgreementStatus(row.agreement_status),
    collaborationId: row.collaboration_id,
    agreedRevision: row.agreed_revision,
    version: row.version,
  };
}

export function debtToCreateSyncPayload(
  debt: Debt,
): Record<string, unknown> {
  return {
    memberId: debt.memberId,
    direction: debt.direction,
    amount: debt.money.amount,
    currency: debt.money.currencyCode,
    title: debt.title,
    dueDate: debt.dueDate,
    createdAt: debt.createdAt,
  };
}

export function syncPayloadToDebt(value: Record<string, unknown>): Debt {
  return {
    id: requireString(value.id, "id"),
    ownerUserId: requireString(value.ownerUserId, "ownerUserId"),
    memberId: requireString(value.memberId, "memberId"),
    direction: requireDirection(requireString(value.direction, "direction")),
    money: createMoney(
      requireAmount(value.amount),
      requireString(value.currency, "currency"),
    ),
    title: requireString(value.title, "title"),
    dueDate:
      value.dueDate === null
        ? null
        : requireString(value.dueDate, "dueDate"),
    createdAt: requireString(value.createdAt, "createdAt"),
    updatedAt: requireString(value.updatedAt, "updatedAt"),
    agreementStatus: requireAgreementStatus(
      value.agreementStatus === undefined ? "private" : value.agreementStatus,
    ),
    collaborationId:
      value.collaborationId === null || value.collaborationId === undefined
        ? null
        : requireString(value.collaborationId, "collaborationId"),
    agreedRevision: requireNullablePositiveVersion(value.agreedRevision),
    version: requireVersion(value.version),
  };
}

function requireDirection(value: string): DebtDirection {
  if (value !== "you_owe" && value !== "they_owe") {
    throw new Error(`Invalid debt direction '${value}'.`);
  }

  return value;
}

function requireAgreementStatus(value: unknown): Debt["agreementStatus"] {
  if (
    value !== "private" &&
    value !== "pending" &&
    value !== "agreed" &&
    value !== "disagreed"
  ) {
    throw new Error("Invalid debt agreement status.");
  }
  return value;
}

function requireNullablePositiveVersion(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const version = requireVersion(value);
  if (version === 0) {
    throw new Error("Invalid debt agreed revision.");
  }
  return version;
}

function requireAmount(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  throw new Error("Invalid debt sync amount.");
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
