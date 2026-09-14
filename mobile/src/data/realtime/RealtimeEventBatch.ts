import { parseRealtimeEvent, type RealtimeEvent } from "@/src/data/realtime/RealtimeEvent";

export type RealtimeEventBatch = {
  events: RealtimeEvent[];
  nextSequence: string;
  hasMore: boolean;
};

export function parseRealtimeEventBatch(value: unknown): RealtimeEventBatch {
  const object = requireObject(value, "event batch");
  if (!Array.isArray(object.events)) {
    throw new Error("Backend returned an invalid realtime event list.");
  }

  const nextSequence = requireString(object.nextSequence, "nextSequence");
  if (!/^\d+$/.test(nextSequence)) {
    throw new Error("Backend returned an invalid realtime cursor.");
  }

  if (typeof object.hasMore !== "boolean") {
    throw new Error("Backend returned an invalid realtime hasMore value.");
  }

  return {
    events: object.events.map(parseRealtimeEvent),
    nextSequence,
    hasMore: object.hasMore,
  };
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
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
