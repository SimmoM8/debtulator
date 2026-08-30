import { useCallback, useEffect, useState } from "react";

import { openDatabase } from "@/src/database/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";

import { SqliteDebtRepository } from "../data/SqliteDebtRepository";
import type { Debt } from "../model/Debt";

export function useDebts() {
  const auth = useAuth();

  const [data, setData] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const ownerUserId = auth.session?.user.id ?? null;

  const loadDebts = useCallback(async () => {
    if (!ownerUserId) {
      return [];
    }

    const database = await openDatabase();
    const repository = new SqliteDebtRepository(database);

    return repository.getAllByOwner(ownerUserId);
  }, [ownerUserId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const debts = await loadDebts();
      setData(debts);
    } catch (error) {
      setError(
        error instanceof Error ? error : new Error("Failed to load debts."),
      );
    } finally {
      setLoading(false);
    }
  }, [loadDebts]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!ownerUserId) {
        if (!cancelled) {
          setData([]);
          setError(null);
          setLoading(false);
        }

        return;
      }

      try {
        const debts = await loadDebts();

        if (!cancelled) {
          setData(debts);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error : new Error("Failed to load debts."),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadDebts, ownerUserId]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
