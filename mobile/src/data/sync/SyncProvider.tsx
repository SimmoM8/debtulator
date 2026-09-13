import type { PropsWithChildren } from "react";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";

import type { BackendClient } from "@/src/data/backend/BackendClient";
import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { openDatabase } from "@/src/data/sqlite/openDatabase";

import { BackendSyncGateway } from "./BackendSyncGateway";
import { SyncBlockedError, SyncEngine } from "./SyncEngine";
import { subscribeToSyncRequests } from "./syncSignal";

const SYNC_INTERVAL_MS = 60_000;

type SyncProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

export function SyncProvider({ ownerUserId, children }: SyncProviderProps) {
  const backend = useBackendClient();

  const runSync = useCallback(async () => {
    if (!backend) {
      return;
    }

    try {
      const db = await openDatabase();
      const engine = getSyncEngine(db, ownerUserId, backend);
      await engine.sync(ownerUserId);
    } catch (error) {
      if (error instanceof SyncBlockedError) {
        console.warn("Sync requires attention", error.message);
        return;
      }

      /*
       * Remote failure must never make locally stored data unusable.
       * Pending mutations and the last valid reference-data snapshots remain
       * durable in SQLite for a later retry.
       */
      console.warn("Sync failed", error);
    }
  }, [backend, ownerUserId]);

  useEffect(() => {
    void runSync();

    return subscribeToSyncRequests(runSync);
  }, [runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void runSync();
      }
    });

    return () => subscription.remove();
  }, [runSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        void runSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [runSync]);

  return children;
}

let syncEngine: {
  db: Awaited<ReturnType<typeof openDatabase>>;
  ownerUserId: string;
  backend: BackendClient;
  engine: SyncEngine;
} | null = null;

function getSyncEngine(
  db: Awaited<ReturnType<typeof openDatabase>>,
  ownerUserId: string,
  backend: BackendClient,
): SyncEngine {
  if (
    !syncEngine ||
    syncEngine.db !== db ||
    syncEngine.ownerUserId !== ownerUserId ||
    syncEngine.backend !== backend
  ) {
    syncEngine = {
      db,
      ownerUserId,
      backend,
      engine: new SyncEngine(db, new BackendSyncGateway(backend)),
    };
  }

  return syncEngine.engine;
}
