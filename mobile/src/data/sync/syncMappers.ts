import type { Debt } from "@/src/features/debts/model/Debt";
import type { Member } from "@/src/features/members/model/Member";

export function remoteMemberToDomain(value: Record<string, unknown>): Member {
  return {
    id: requireString(value.id),
    ownerUserId: requireString(value.owner_user_id),
    displayName: requireString(value.display_name),
    createdAt: requireString(value.created_at),
    updatedAt: requireString(value.updated_at),
  };
}

export function remoteDebtToDomain(value: Record<string, unknown>): Debt {
  const direction = requireString(value.direction);

  if (direction !== "you_owe" && direction !== "they_owe") {
    throw new Error(`Invalid remote debt direction: ${direction}`);
  }

  return {
    id: requireString(value.id),
    ownerUserId: requireString(value.owner_user_id),
    memberId: requireString(value.member_id),
    direction,
    amount: requireNumber(value.amount),
    currency: requireString(value.currency),
    title: requireString(value.title),
    dueDate: value.due_date === null ? null : requireString(value.due_date),
    createdAt: requireString(value.created_at),
    updatedAt: requireString(value.updated_at),
  };
}

function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Expected string in remote sync payload.");
  }

  return value;
}

function requireNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  throw new Error("Expected number in remote sync payload.");
}
