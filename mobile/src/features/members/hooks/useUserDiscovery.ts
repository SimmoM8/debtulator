import { useCallback, useEffect, useRef, useState } from "react";

import { BackendError } from "@/src/data/backend/BackendClient";
import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { useAuth } from "@/src/features/auth/AuthProvider";
import type { DiscoveredUser } from "@/src/features/members/model/DiscoveredUser";
import { searchUsers } from "@/src/features/members/operations/searchUsers";

const SEARCH_DEBOUNCE_MS = 300;

export function useUserDiscovery(query: string) {
  const backend = useBackendClient();
  const auth = useAuth();
  const normalizedQuery = query.trim();
  const [data, setData] = useState<DiscoveredUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;

    if (!normalizedQuery || !backend) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setData([]);
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const results = await searchUsers(backend, normalizedQuery);

          if (requestId.current !== currentRequestId) {
            return;
          }

          setData(results.filter((user) => user.id !== auth.session?.user.id));
        } catch (error) {
          if (requestId.current !== currentRequestId) {
            return;
          }

          setError(toDiscoveryError(error));
        } finally {
          if (requestId.current === currentRequestId) {
            setLoading(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [backend, auth.session?.user.id, normalizedQuery, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

function toDiscoveryError(error: unknown): Error {
  if (error instanceof BackendError && error.status === 429) {
    return new Error(
      error.retryAfterSeconds !== null
        ? `Too many searches. Try again in ${error.retryAfterSeconds} seconds.`
        : "Too many searches. Try again shortly.",
    );
  }

  return error instanceof Error
    ? error
    : new Error("Couldn’t search for users.");
}
