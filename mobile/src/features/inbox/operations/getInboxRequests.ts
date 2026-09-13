import type { BackendClient } from "@/src/data/backend/BackendClient";
import type {
  RequestInboxDirection,
  RequestInboxItem,
  RequestInboxScope,
} from "@/src/features/inbox/model/RequestInboxItem";

export async function getInboxRequests(
  backend: BackendClient,
  scope: RequestInboxScope,
  requestTypes: readonly string[] = [],
): Promise<RequestInboxItem[]> {
  const query = new URLSearchParams({
    scope,
    limit: "100",
  });

  for (const requestType of requestTypes) {
    query.append("type", requestType);
  }

  const value = await backend.get<unknown>(
    `/api/v1/inbox/requests?${query.toString()}`,
  );

  if (!Array.isArray(value)) {
    throw new Error("Backend returned an invalid Inbox response.");
  }

  return value.map(parseInboxRequest);
}

function parseInboxRequest(value: unknown): RequestInboxItem {
  const object = requireObject(value);

  return {
    requestId: requireString(object.requestId, "requestId"),
    type: requireString(object.type, "type"),
    direction: requireDirection(object.direction),
    status: requireString(object.status, "status"),
    counterpartyUserId: requireString(
      object.counterpartyUserId,
      "counterpartyUserId",
    ),
    counterpartyName: requireString(
      object.counterpartyName,
      "counterpartyName",
    ),
    createdAt: requireString(object.createdAt, "createdAt"),
    updatedAt: requireString(object.updatedAt, "updatedAt"),
  };
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Backend returned an invalid Inbox item.");
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Backend returned an invalid Inbox ${field}.`);
  }

  return value;
}

function requireDirection(value: unknown): RequestInboxDirection {
  const direction = requireString(value, "direction");

  if (direction !== "incoming" && direction !== "outgoing") {
    throw new Error("Backend returned an invalid Inbox direction.");
  }

  return direction;
}
