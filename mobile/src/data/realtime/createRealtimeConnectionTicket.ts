import type { BackendClient } from "@/src/data/backend/BackendClient";

export type RealtimeConnectionTicket = {
  ticket: string;
  expiresAt: string;
};

export async function createRealtimeConnectionTicket(
  backend: BackendClient,
  afterSequence: string | null,
): Promise<RealtimeConnectionTicket> {
  const value = await backend.post<unknown>("/api/v1/realtime/tickets", {
    afterSequence:
      afterSequence === null ? null : parseSequenceNumber(afterSequence),
  });

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Backend returned an invalid realtime ticket.");
  }

  const object = value as Record<string, unknown>;

  return {
    ticket: requireString(object.ticket, "ticket"),
    expiresAt: requireString(object.expiresAt, "expiresAt"),
  };
}

function parseSequenceNumber(value: string): number {
  const sequence = Number(value);

  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(sequence) ||
    sequence < 0
  ) {
    throw new Error("The realtime resume cursor is invalid.");
  }

  return sequence;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Backend returned an invalid realtime ${field}.`);
  }

  return value;
}
