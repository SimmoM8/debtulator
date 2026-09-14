import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { subscribeToRealtimeEvents } from "@/src/data/realtime/realtimeSignal";
import type {
  RequestInboxItem,
  RequestInboxScope,
} from "@/src/features/inbox/model/RequestInboxItem";
import { getInboxRequests } from "@/src/features/inbox/operations/getInboxRequests";

export function useInboxRequests(
  scope: RequestInboxScope,
  requestTypes: readonly string[] = [],
) {
  const backend = useBackendClient();
  const requestSequence = useRef(0);
  const requestTypesKey = requestTypes.join(",");

  const [data, setData] = useState<RequestInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      const sequence = ++requestSequence.current;

      if (!backend) {
        setData([]);
        setLoading(false);
        setError(new Error("The backend is not available."));
        return;
      }

      if (showLoading) {
        setData([]);
        setLoading(true);
      }

      setError(null);

      try {
        const items = await getInboxRequests(
          backend,
          scope,
          requestTypesKey ? requestTypesKey.split(",") : [],
        );

        if (sequence === requestSequence.current) {
          setData(items);
        }
      } catch (error) {
        if (sequence === requestSequence.current) {
          setError(
            error instanceof Error
              ? error
              : new Error("Failed to load Inbox requests."),
          );
        }
      } finally {
        if (showLoading && sequence === requestSequence.current) {
          setLoading(false);
        }
      }
    },
    [backend, requestTypesKey, scope],
  );

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      return () => {
        requestSequence.current += 1;
      };
    }, [refresh]),
  );

  useEffect(
    () =>
      subscribeToRealtimeEvents((event) => {
        if (
          event.type === "inbox.request.created" ||
          event.type === "inbox.request.updated"
        ) {
          void load(false);
        }
      }),
    [load],
  );

  return {
    data,
    loading,
    error,
    refresh,
  };
}
