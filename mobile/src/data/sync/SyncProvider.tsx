import type { PropsWithChildren } from "react";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";

import { backendApiUrl } from "@/src/data/backend/backendConfig";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";

import {
  BackendApiError,
  BackendSyncGateway,
} from "./BackendSyncGateway";
import { SyncBlockedError, SyncEngine } from "./SyncEngine";
import { subscribeToSyncRequests } from "./syncSignal";

const SYNC_INTERVAL_MS = 60_000;

type SyncProviderProps = PropsWithChildren<{
  ownerUserId: string;
}>;

type AccessTokenProvider = (options?: {
  forceRefresh?: boolean;
}) => Promise<string>;

export function SyncProvider({ ownerUserId, children }: SyncProviderProps) {
  const auth = useAuth();

  const runSync = useCallback(async () => {
    if (!backendApiUrl || !auth.session) {
      return;
    }

    try {
      const db = await openDatabase();
      const engine = getSyncEngine(
        db,
        ownerUserId,
        auth.getAccessToken,
      );

      try {
        await engine.sync(ownerUserId);
      } catch (error) {
        if (!(error instanceof BackendApiError) || error.status !== 401) {
          throw error;
        }

        /*
         * The backend rejected the access token. Force one refresh through
         * AuthProvider, which also clears the app session when the refresh
         * token is no longer valid, then retry the sync once.
         */
        await auth.getAccessToken({ forceRefresh: true });
        await engine.sync(ownerUserId);
      }
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
  }, [auth.getAccessToken, auth.session, ownerUserId]);

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
  getAccessToken: AccessTokenProvider;
  engine: SyncEngine;
} | null = null;

function getSyncEngine(
  db: Awaited<ReturnType<typeof openDatabase>>,
  ownerUserId: string,
  getAccessToken: AccessTokenProvider,
): SyncEngine {
  if (
    !syncEngine ||
    syncEngine.db !== db ||
    syncEngine.ownerUserId !== ownerUserId ||
    syncEngine.getAccessToken !== getAccessToken
  ) {
    const remote = new BackendSyncGateway(
      backendApiUrl,
      () => getAccessToken(),
    );

    syncEngine = {
      db,
      ownerUserId,
      getAccessToken,
      engine: new SyncEngine(db, remote),
    };
  }

  return syncEngine.engine;
}
