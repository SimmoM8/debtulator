import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

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

  const refresh = useCallback(async () => {
    if (!ownerUserId) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const database = await openDatabase();
      const repository = new SqliteDebtRepository(database);

      const debts = await repository.getAllByOwner(ownerUserId);

      setData(debts);
    } catch (error) {
      setError(
        error instanceof Error ? error : new Error("Failed to load debts."),
      );
    } finally {
      setLoading(false);
    }
  }, [ownerUserId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    data,
    loading,
    error,
    refresh,
  };
}
