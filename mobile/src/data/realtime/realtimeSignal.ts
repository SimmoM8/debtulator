import type { RealtimeEvent } from "@/src/data/realtime/RealtimeEvent";

type RealtimeEventListener = (event: RealtimeEvent) => void;

const listeners = new Set<RealtimeEventListener>();

export function subscribeToRealtimeEvents(
  listener: RealtimeEventListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function publishRealtimeEvent(event: RealtimeEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}
