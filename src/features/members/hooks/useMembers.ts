import { useCallback, useEffect, useState } from "react";

import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";

import { subscribeToDataChanges } from "@/src/data/sqlite/dataChanges";
import { SqliteMemberRepository } from "@/src/features/members/data/SqliteMemberRepository";
import type { Member } from "@/src/features/members/model/Member";
import { useFocusEffect } from "expo-router";

export function useMembers() {
  const auth = useAuth();

  const [data, setData] = useState<Member[]>([]);
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

      const repository = new SqliteMemberRepository(database);

      const members = await repository.getAllByOwner(ownerUserId);

      setData(members);
    } catch (error) {
      setError(
        error instanceof Error ? error : new Error("Failed to load members."),
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
      if (resources.has("members")) {
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
