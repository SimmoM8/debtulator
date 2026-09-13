import { useCallback, useEffect, useRef, useState } from "react";

import { useBackendClient } from "@/src/data/backend/BackendProvider";
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

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;

    if (!backend) {
      setData([]);
      setLoading(false);
      setError(new Error("The backend is not available."));
      return;
    }

    setData([]);
    setLoading(true);
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
      if (sequence === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [backend, requestTypesKey, scope]);

  useEffect(() => {
    void refresh();

    return () => {
      requestSequence.current += 1;
    };
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
