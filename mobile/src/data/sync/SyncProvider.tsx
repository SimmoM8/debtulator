import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useState } from "react";
import { AppState, View } from "react-native";

import type { BackendClient } from "@/src/data/backend/BackendClient";
import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { openDatabase } from "@/src/data/sqlite/openDatabase";

import { BackendSyncGateway } from "./BackendSyncGateway";
import { SyncBlockedError, SyncEngine } from "./SyncEngine";
import { SyncStatusPanel } from "./SyncStatusPanel";
import { subscribeToSyncRequests } from "./syncSignal";

const SYNC_INTERVAL_MS = 60_000;

type SyncProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

export function SyncProvider({ ownerUserId, children }: SyncProviderProps) {
  const backend = useBackendClient();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRevision, setSyncRevision] = useState(0);

  const runSync = useCallback(async () => {
    if (!backend) {
      return;
    }

    try {
      const db = await openDatabase();
      const engine = getSyncEngine(db, ownerUserId, backend);
      await engine.sync(ownerUserId);
      setSyncError(null);
    } catch (error) {
      if (error instanceof SyncBlockedError) {
        setSyncError("One or more changes need your review before sync can continue.");
        console.warn("Sync requires attention", error.message);
        return;
      }

      /*
       * Remote failure must never make locally stored data unusable.
       * Pending mutations and the last valid reference-data snapshots remain
       * durable in SQLite for a later retry.
       */
      setSyncError("Could not reach or complete synchronization. Your unsent changes are still saved on this device.");
      console.warn("Sync failed", error);
    } finally {
      setSyncRevision((current) => current + 1);
    }
  }, [backend, ownerUserId]);

  useEffect(() => {
    const unsubscribe = subscribeToSyncRequests(runSync);
    const initialSync = setTimeout(() => {
      void runSync();
    }, 0);

    return () => {
      clearTimeout(initialSync);
      unsubscribe();
    };
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

  return (
    <View style={{ flex: 1 }}>
      {children}
      <SyncStatusPanel
        ownerUserId={ownerUserId}
        backend={backend}
        error={syncError}
        revision={syncRevision}
        onRetry={runSync}
      />
    </View>
  );
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
