import type { PropsWithChildren } from "react";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";

import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { supabase } from "@/src/data/supabase/supabaseClient";

import { BackendSyncGateway } from "./BackendSyncGateway";
import { SyncBlockedError, SyncEngine } from "./SyncEngine";
import { subscribeToSyncRequests } from "./syncSignal";

const SYNC_INTERVAL_MS = 60_000;
const backendApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

type SyncProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

export function SyncProvider({ ownerUserId, children }: SyncProviderProps) {
  const runSync = useCallback(async () => {
    if (!supabase || !backendApiUrl) {
      return;
    }

    try {
      const db = await openDatabase();
      const engine = getSyncEngine(db, ownerUserId);

      await engine.sync(ownerUserId);
    } catch (error) {
      if (error instanceof SyncBlockedError) {
        console.warn("Sync requires attention", error.message);
        return;
      }

      /*
       * Remote failure must never make locally stored data unusable.
       * Pending mutations remain durable in SQLite for a later retry.
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
    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        void runSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [runSync]);

  return children;
}

let syncEngine: {
  db: Awaited<ReturnType<typeof openDatabase>>;
  ownerUserId: string;
  engine: SyncEngine;
} | null = null;

function getSyncEngine(
  db: Awaited<ReturnType<typeof openDatabase>>,
  ownerUserId: string,
): SyncEngine {
  if (
    !syncEngine ||
    syncEngine.db !== db ||
    syncEngine.ownerUserId !== ownerUserId
  ) {
    const remote = new BackendSyncGateway(
      backendApiUrl,
      async () => {
        if (!supabase) {
          throw new Error("Supabase Auth is not configured.");
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const accessToken = data.session?.access_token;

        if (!accessToken) {
          throw new Error("No authenticated access token is available.");
        }

        return accessToken;
      },
    );

    syncEngine = {
      db,
      ownerUserId,
      engine: new SyncEngine(db, remote),
    };
  }

  return syncEngine.engine;
}
