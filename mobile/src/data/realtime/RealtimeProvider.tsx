import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { AppState } from "react-native";

import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { backendApiUrl } from "@/src/data/backend/backendConfig";
import { createRealtimeConnectionTicket } from "@/src/data/realtime/createRealtimeConnectionTicket";
import { parseRealtimeEvent } from "@/src/data/realtime/RealtimeEvent";
import { publishRealtimeEvent } from "@/src/data/realtime/realtimeSignal";
import { createRealtimeUrl } from "@/src/data/realtime/realtimeUrl";

type RealtimeProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
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

    let disposed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;
    let lastSequence: string | null = null;
    const recentEventIds = new Set<string>();
    const recentEventOrder: string[] = [];

    function clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
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

        if (oldest) {
          recentEventIds.delete(oldest);
        }
      }

      return true;
    }

    function scheduleReconnect() {
      if (
        disposed ||
        AppState.currentState !== "active" ||
        reconnectTimer !== null
      ) {
        return;
      }

      const index = Math.min(
        reconnectAttempt,
        RECONNECT_DELAYS_MS.length - 1,
      );
      const delay = RECONNECT_DELAYS_MS[index];

      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    }

    async function connect() {
      if (
        disposed ||
        !backend ||
        AppState.currentState !== "active" ||
        socket !== null
      ) {
        return;
      }

      try {
        const connectionTicket =
          await createRealtimeConnectionTicket(backend, lastSequence);

        if (disposed || AppState.currentState !== "active") {
          return;
        }

        const nextSocket = new WebSocket(
          createRealtimeUrl(backendApiUrl, connectionTicket.ticket),
        );

        socket = nextSocket;

        nextSocket.onopen = () => {
          reconnectAttempt = 0;
        };

        nextSocket.onmessage = (message) => {
          if (typeof message.data !== "string") {
            return;
          }

          try {
            const value = JSON.parse(message.data) as unknown;

            if (
              typeof value === "object" &&
              value !== null &&
              !Array.isArray(value) &&
              (value as Record<string, unknown>).type === "realtime.keepalive"
            ) {
              return;
            }

            const event = parseRealtimeEvent(value);
            lastSequence = maxSequence(lastSequence, event.sequence);

            if (rememberEvent(event.id)) {
              publishRealtimeEvent(event);
            }
          } catch (error) {
            console.warn("Ignored invalid realtime message", error);
          }
        };

        nextSocket.onerror = () => {
          nextSocket.close();
        };

        nextSocket.onclose = () => {
          if (socket === nextSocket) {
            socket = null;
          }

          scheduleReconnect();
        };
      } catch (error) {
        console.warn("Realtime connection failed", error);
        scheduleReconnect();
      }
    }

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void connect();
          return;
        }

        clearReconnectTimer();

        if (socket) {
          const currentSocket = socket;
          socket = null;
          currentSocket.close();
        }
      },
    );

    void connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      appStateSubscription.remove();

      if (socket) {
        const currentSocket = socket;
        socket = null;
        currentSocket.close();
      }
    };
  }, [backend, ownerUserId]);

  return children;
}

function maxSequence(
  current: string | null,
  next: string,
): string {
  if (current === null) {
    return next;
  }

  const currentValue = BigInt(current);
  const nextValue = BigInt(next);

  return nextValue > currentValue ? next : current;
}
