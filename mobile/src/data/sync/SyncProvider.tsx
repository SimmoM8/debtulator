import type { PropsWithChildren } from "react";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";

import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { supabase } from "@/src/data/supabase/supabaseClient";

import { SupabaseSyncGateway } from "./SupabaseSyncGateway";
import { SyncEngine } from "./SyncEngine";
import { subscribeToSyncRequests } from "./syncSignal";

type SyncProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

export function SyncProvider({ ownerUserId, children }: SyncProviderProps) {
  const runSync = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      const db = await openDatabase();

      const remote = new SupabaseSyncGateway(supabase);

      const engine = getSyncEngine(db, remote);

      await engine.sync(ownerUserId);
    } catch (error) {
      /*
       * Sync failure must not make locally stored data unusable.
       *
       * Failed outbox mutations remain queued for the next attempt.
       */
      console.warn("Sync failed", error);
    }
  }, [ownerUserId]);

  useEffect(() => {
    void runSync();

    return subscribeToSyncRequests(() => {
      void runSync();
    });
  }, [runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void runSync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [runSync]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    const channel = client
      .channel(`sync:${ownerUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sync_changes",
          filter: `owner_user_id=eq.${ownerUserId}`,
        },
        () => {
          void runSync();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [ownerUserId, runSync]);

  return children;
}

let syncEngine: {
  db: Awaited<ReturnType<typeof openDatabase>>;
  engine: SyncEngine;
} | null = null;

function getSyncEngine(
  db: Awaited<ReturnType<typeof openDatabase>>,
  remote: SupabaseSyncGateway,
) {
  if (!syncEngine || syncEngine.db !== db) {
    syncEngine = {
      db,
      engine: new SyncEngine(db, remote),
    };
  }

  return syncEngine.engine;
}
