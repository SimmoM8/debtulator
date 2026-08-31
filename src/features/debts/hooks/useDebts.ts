import { useCallback, useEffect, useState } from "react";

import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";

import { subscribeToDataChanges } from "@/src/data/sqlite/dataChanges";
import { SqliteDebtRepository } from "@/src/features/debts/data/SqliteDebtRepository";
import type { Debt } from "@/src/features/debts/model/Debt";
import { useFocusEffect } from "expo-router";

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

  useEffect(() => {
    return subscribeToDataChanges((resources) => {
      if (resources.has("debts")) {
        void refresh();
      }
    });
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
