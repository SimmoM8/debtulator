import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { AppState } from "react-native";

import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { parseRealtimeEventBatch } from "@/src/data/realtime/RealtimeEventBatch";
import { publishRealtimeEvent } from "@/src/data/realtime/realtimeSignal";

type RealtimeProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

const POLL_INTERVAL_MS = 5_000;
const RECENT_EVENT_LIMIT = 200;

export function RealtimeProvider({
  ownerUserId,
  children,
}: RealtimeProviderProps) {
  const backend = useBackendClient();

  useEffect(() => {
    if (!backend) {
      return;
    }

    const client = backend;
    let disposed = false;
    let polling = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cursor: string | null = null;
    const recentEventIds = new Set<string>();
    const recentEventOrder: string[] = [];

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function rememberEvent(id: string): boolean {
      if (recentEventIds.has(id)) {
        return false;
      }
      recentEventIds.add(id);
      recentEventOrder.push(id);
      if (recentEventOrder.length > RECENT_EVENT_LIMIT) {
        const oldest = recentEventOrder.shift();
        if (oldest) recentEventIds.delete(oldest);
      }
      return true;
    }

    function scheduleNext() {
      clearTimer();
      if (disposed || AppState.currentState !== "active") return;
      timer = setTimeout(() => {
        timer = null;
        void poll();
      }, POLL_INTERVAL_MS);
    }

    async function poll() {
      if (
        disposed ||
        polling ||
        AppState.currentState !== "active"
      ) {
        return;
      }

      polling = true;
      try {
        let hasMore = true;
        do {
          const query = cursor === null
            ? ""
            : `?after=${encodeURIComponent(cursor)}&limit=100`;
          const batch = parseRealtimeEventBatch(
            await client.get<unknown>(`/api/v1/realtime/events${query}`),
          );

          cursor = batch.nextSequence;
          for (const event of batch.events) {
            if (rememberEvent(event.id)) {
              publishRealtimeEvent(event);
            }
          }
          hasMore = batch.hasMore;
        } while (hasMore && !disposed && AppState.currentState === "active");
      } catch (error) {
        console.warn("Realtime event poll failed", error);
      } finally {
        polling = false;
        scheduleNext();
      }
    }

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void poll();
      } else {
        clearTimer();
      }
    });

    void poll();

    return () => {
      disposed = true;
      clearTimer();
      appStateSubscription.remove();
    };
  }, [backend, ownerUserId]);

  return children;
}
