export type RealtimeEvent = {
  sequence: string;
  id: string;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export function parseRealtimeEvent(value: unknown): RealtimeEvent {
  const object = requireObject(value, "realtime event");
  const sequence = requireString(object.sequence, "sequence");

  if (!/^\d+$/.test(sequence)) {
    throw new Error("Backend returned an invalid realtime sequence.");
  }

  return {
    sequence,
    id: requireString(object.id, "id"),
    type: requireString(object.type, "type"),
    payload: requireObject(object.payload, "payload"),
    occurredAt: requireString(object.occurredAt, "occurredAt"),
  };
}

function requireObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Backend returned an invalid realtime ${field}.`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Backend returned an invalid realtime ${field}.`);
  }

  return value;
}
