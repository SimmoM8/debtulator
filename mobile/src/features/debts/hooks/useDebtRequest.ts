import { useCallback, useEffect, useState } from "react";

import { useBackendClient } from "@/src/data/backend/BackendProvider";
import type { DebtRequest } from "@/src/features/debts/model/DebtRequest";
import { getDebtRequest } from "@/src/features/debts/operations/getDebtRequest";

export function useDebtRequest(requestId: string | null) {
  const backend = useBackendClient();
  const [data, setData] = useState<DebtRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!backend || !requestId) {
      setData(null);
      setLoading(false);
      setError(new Error("The debt request is unavailable."));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setData(await getDebtRequest(backend, requestId));
    } catch (error) {
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to load debt request."),
      );
    } finally {
      setLoading(false);
    }
  }, [backend, requestId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
