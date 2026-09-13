import { useCallback, useEffect, useState } from "react";

import { subscribeToDataChanges } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { SqliteCurrencyRepository } from "@/src/features/currencies/data/SqliteCurrencyRepository";
import type { Currency } from "@/src/features/currencies/model/Currency";

/** Reads the complete last-synchronized currency catalogue from SQLite. */
export function useCurrencyCatalogue() {
  const [data, setData] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const database = await openDatabase();
      const repository = new SqliteCurrencyRepository(database);
      setData(await repository.getAll());
    } catch (error) {
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to load the currency catalogue."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    return subscribeToDataChanges((resources) => {
      if (resources.has("currencies")) {
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
