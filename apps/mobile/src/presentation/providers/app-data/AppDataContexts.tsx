import React, { createContext, useContext, useMemo } from 'react';

import type { AppSnapshot } from '@debtulator/application/model/AppSnapshot';
import type {
  ContentCommandFacade,
  DebtCommandFacade,
  GroupCommandFacade,
  LocalLedgerCommands,
  MemberCommandFacade,
  PaymentCommandFacade,
  SystemCommandFacade,
} from '@debtulator/application/local-data/createLocalLedgerCommands';
import type { buildSyncSummary } from '@debtulator/application/sync/syncPolicy';
import type {
  calculatePersonalTotals,
} from '@debtulator/domain/ledger/ledger';
import type { LedgerEntry, MoneyMap } from '@debtulator/domain/models';

export type AppSnapshotReadValue = AppSnapshot & {
  ready: boolean;
  loading: boolean;
  error: string | null;
  ledgerEntries: LedgerEntry[];
  memberBalances: Record<string, MoneyMap>;
  personalTotals: ReturnType<typeof calculatePersonalTotals>;
  syncSummary: ReturnType<typeof buildSyncSummary>;
  setLedgerUserId: (userId: string | null) => void;
  refresh: () => Promise<void>;
  retryBoot: () => void;
  syncedDataResetVersion: number;
};

export type AppDataContextValue = AppSnapshotReadValue & LocalLedgerCommands;

const AppSnapshotContext = createContext<AppSnapshotReadValue | null>(null);
const AppCommandsContext = createContext<LocalLedgerCommands | null>(null);

const unavailableCommands = new Proxy({} as LocalLedgerCommands, {
  get: (_target, property) => {
    if (typeof property !== 'string') {
      return undefined;
    }
    return async () => {
      throw new Error('Local database is not ready yet.');
    };
  },
});

export function AppDataContextsProvider({
  snapshot,
  commands,
  children,
}: {
  snapshot: AppSnapshotReadValue;
  commands: LocalLedgerCommands | null;
  children: React.ReactNode;
}) {
  return (
    <AppSnapshotContext.Provider value={snapshot}>
      <AppCommandsContext.Provider value={commands}>
        {children}
      </AppCommandsContext.Provider>
    </AppSnapshotContext.Provider>
  );
}

export function useAppSnapshot(): AppSnapshotReadValue {
  const value = useContext(AppSnapshotContext);
  if (!value) {
    throw new Error('useAppSnapshot must be used inside AppDataProvider.');
  }
  return value;
}

export function useLocalLedgerCommands(): LocalLedgerCommands {
  const value = useContext(AppCommandsContext);
  const snapshot = useContext(AppSnapshotContext);
  if (!snapshot) {
    throw new Error('useLocalLedgerCommands must be used inside AppDataProvider.');
  }
  return value ?? unavailableCommands;
}

export function useMemberCommands(): MemberCommandFacade {
  return useLocalLedgerCommands();
}

export function useDebtCommands(): DebtCommandFacade {
  return useLocalLedgerCommands();
}

export function useGroupCommands(): GroupCommandFacade {
  return useLocalLedgerCommands();
}

export function usePaymentCommands(): PaymentCommandFacade {
  return useLocalLedgerCommands();
}

export function useContentCommands(): ContentCommandFacade {
  return useLocalLedgerCommands();
}

export function useSystemCommands(): SystemCommandFacade {
  return useLocalLedgerCommands();
}

/** Compatibility facade while screens migrate to focused read/command hooks. */
export function useAppData(): AppDataContextValue {
  const snapshot = useAppSnapshot();
  const commands = useLocalLedgerCommands();
  return useMemo(
    () => {
      const merged = { ...snapshot, ...commands } as AppDataContextValue;
      return new Proxy(merged, {
        get: (target, property, receiver) =>
          Reflect.has(target, property)
            ? Reflect.get(target, property, receiver)
            : Reflect.get(commands, property),
      });
    },
    [commands, snapshot],
  );
}
