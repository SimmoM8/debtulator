import { useCallback, useEffect, useState } from "react";

import { subscribeToDataChanges } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { SqliteProfileRepository } from "@/src/features/profile/data/SqliteProfileRepository";
import type { Profile } from "@/src/features/profile/model/Profile";

export function useProfile() {
  const auth = useAuth();
  const userId = auth.session?.user.id ?? null;

  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const database = await openDatabase();
      setData(await new SqliteProfileRepository(database).get(userId));
    } catch (error) {
      setError(
        error instanceof Error ? error : new Error("Failed to load profile."),
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();

    return subscribeToDataChanges((resources) => {
      if (resources.has("profile")) {
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
