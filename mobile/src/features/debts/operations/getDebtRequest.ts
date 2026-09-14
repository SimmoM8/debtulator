import type { BackendClient } from "@/src/data/backend/BackendClient";
import type { DebtRequest } from "@/src/features/debts/model/DebtRequest";

export async function getDebtRequest(
  backend: BackendClient,
  requestId: string,
): Promise<DebtRequest> {
  const value = await backend.get<unknown>(
    `/api/v1/agreements/requests/${encodeURIComponent(requestId)}`,
  );

  return parseDebtRequest(value);
}

function parseDebtRequest(value: unknown): DebtRequest {
  const object = requireObject(value, "debt request");

  if (requireString(object.entityType, "entityType") !== "debt") {
    throw new Error("Backend returned a non-debt agreement request.");
  }

  if (requireString(object.action, "action") !== "create") {
    throw new Error("Backend returned an unsupported debt request action.");
  }

  const payload = requireObject(object.payload, "payload");

  return {
    id: requireString(object.id, "id"),
    direction: requireDirection(object.direction),
    userId: requireString(object.userId, "userId"),
    entityId: requireString(object.entityId, "entityId"),
    entityVersion: requireVersion(object.entityVersion),
    action: "create",
    payload: {
      memberId: requireString(payload.memberId, "payload.memberId"),
      direction: requireDebtDirection(payload.direction),
      amount: requireString(payload.amount, "payload.amount"),
      currency: requireString(payload.currency, "payload.currency"),
      title: requireString(payload.title, "payload.title"),
      dueDate: optionalString(payload.dueDate, "payload.dueDate"),
    },
    status: requireStatus(object.status),
    createdAt: requireString(object.createdAt, "createdAt"),
    resolvedAt: optionalString(object.resolvedAt, "resolvedAt"),
  };
}

function requireObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, field);
}

function requireVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Backend returned an invalid entityVersion.");
  }

  return value;
}

function requireDirection(value: unknown): DebtRequest["direction"] {
  const direction = requireString(value, "direction");

  if (direction !== "incoming" && direction !== "outgoing") {
    throw new Error("Backend returned an invalid request direction.");
  }

  return direction;
}

function requireDebtDirection(
  value: unknown,
): DebtRequest["payload"]["direction"] {
  const direction = requireString(value, "payload.direction");

  if (direction !== "you_owe" && direction !== "they_owe") {
    throw new Error("Backend returned an invalid debt direction.");
  }

  return direction;
}

function requireStatus(value: unknown): DebtRequest["status"] {
  const status = requireString(value, "status");

  if (
    status !== "pending" &&
    status !== "accepted" &&
    status !== "rejected" &&
    status !== "cancelled" &&
    status !== "superseded"
  ) {
    throw new Error("Backend returned an invalid request status.");
  }

  return status;
}
