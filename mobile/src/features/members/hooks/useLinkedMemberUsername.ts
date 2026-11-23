import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToDataChanges } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { requestSync } from "@/src/data/sync/syncSignal";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { SqliteLinkedAccountSummaryRepository } from "@/src/features/members/data/SqliteLinkedAccountSummaryRepository";

type CachedUsername = {
  ownerUserId: string;
  linkedUserId: string;
  username: string | null;
};

/** Reads the last synced account summary locally, including while offline. */
export function useLinkedMemberUsername(
  memberId: string | null,
  linkedUserId: string | null,
): string | null {
  const auth = useAuth();
  const ownerUserId = auth.session?.user.id ?? null;
  const [cached, setCached] = useState<CachedUsername | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;

    if (!ownerUserId || !linkedUserId || !memberId) {
      setCached(null);
      return;
    }

    try {
      const db = await openDatabase();
      const username = await new SqliteLinkedAccountSummaryRepository(
        db,
      ).getUsername(ownerUserId, linkedUserId);

      if (requestVersion.current === version) {
        setCached({ ownerUserId, linkedUserId, username });
      }
    } catch (error) {
      console.warn("Could not read linked account summary", error);
      if (requestVersion.current === version) {
        setCached(null);
      }
    }
  }, [linkedUserId, memberId, ownerUserId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      if (ownerUserId && linkedUserId && memberId) {
        requestSync();
      }

      return () => {
        requestVersion.current += 1;
      };
    }, [linkedUserId, memberId, ownerUserId, refresh]),
  );

  useEffect(() => {
    return subscribeToDataChanges((resources) => {
      if (resources.has("linkedAccounts")) {
        void refresh();
      }
    });
  }, [refresh]);

  return cached?.ownerUserId === ownerUserId &&
    cached?.linkedUserId === linkedUserId &&
    memberId !== null
    ? cached.username
    : null;
}
