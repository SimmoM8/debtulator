import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import type { AppSnapshot } from '@debtulator/application/model/AppSnapshot';
import { EMPTY_APP_SNAPSHOT } from '@debtulator/application/model/emptyAppSnapshot';
import type { LocalLedgerCommands } from '@debtulator/application/local-data/createLocalLedgerCommands';
import { buildSyncSummary } from '@debtulator/application/sync/syncPolicy';
import {
  buildLedgerEntries,
  calculateMemberBalances,
  calculatePersonalTotals,
} from '@debtulator/domain/ledger/ledger';
import {
  openMobileLocalData,
  type MobileLocalDataRuntime,
} from '@/src/composition';
import {
  AppDataContextsProvider,
  type AppSnapshotReadValue,
} from './app-data/AppDataContexts';

export {
  useAppData,
  useAppSnapshot,
  useContentCommands,
  useDebtCommands,
  useGroupCommands,
  useLocalLedgerCommands,
  useMemberCommands,
  usePaymentCommands,
  useSystemCommands,
} from './app-data/AppDataContexts';
export type {
  AppDataContextValue,
  AppSnapshotReadValue,
} from './app-data/AppDataContexts';

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY_APP_SNAPSHOT);
  const [runtime, setRuntime] = useState<MobileLocalDataRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [syncedDataResetVersion, setSyncedDataResetVersion] = useState(0);
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function boot() {
      try {
        setLoading(true);
        setError(null);
        const nextRuntime = await withBootTimeout(
          openMobileLocalData(),
          Platform.OS === 'web' ? 6000 : 20000,
          'Local database boot timed out. Continuing in local preview mode.',
        );

        if (!mounted) {
          return;
        }

        // subscribe() immediately replays the current publication, including
        // any recurring records generated during adapter boot.
        unsubscribe = nextRuntime.coordinator.subscribe(({ snapshot: next }) => {
          if (mounted) {
            setSnapshot(next);
          }
        });
        setRuntime(nextRuntime);
        setError(null);
      } catch (bootError) {
        if (mounted) {
          setRuntime(null);
          setError(
            bootError instanceof Error
              ? bootError.message
              : 'Unable to open local database',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void boot();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [bootAttempt]);

  const retryBoot = useCallback(() => {
    setBootAttempt((attempt) => attempt + 1);
  }, []);

  const refresh = useCallback(async () => {
    await runtime?.coordinator.refresh();
  }, [runtime]);

  const commands = useMemo<LocalLedgerCommands | null>(() => {
    if (!runtime) {
      return null;
    }

    return {
      ...runtime.commands,
      resetSyncedData: async () => {
        await runtime.commands.resetSyncedData();
        setSyncedDataResetVersion((version) => version + 1);
      },
    };
  }, [runtime]);

  const ledgerEntries = useMemo(
    () =>
      buildLedgerEntries(
        snapshot.debts,
        snapshot.sharedExpenses,
        snapshot.groupDebts,
        snapshot.settlementLines,
        snapshot.payments,
        snapshot.overpaymentCredits,
        {
          currentUserId: ledgerUserId,
          debtVerifications: snapshot.debtVerifications,
          groupVerificationResponses: snapshot.groupVerificationResponses,
        },
      ),
    [
      snapshot.debts,
      snapshot.debtVerifications,
      snapshot.groupDebts,
      snapshot.groupVerificationResponses,
      snapshot.overpaymentCredits,
      snapshot.payments,
      snapshot.settlementLines,
      snapshot.sharedExpenses,
      ledgerUserId,
    ],
  );
  const memberBalances = useMemo(
    () => calculateMemberBalances(ledgerEntries),
    [ledgerEntries],
  );
  const personalTotals = useMemo(
    () => calculatePersonalTotals(ledgerEntries),
    [ledgerEntries],
  );
  const syncSummary = useMemo(() => buildSyncSummary(snapshot), [snapshot]);

  const readValue = useMemo<AppSnapshotReadValue>(
    () => ({
      ...snapshot,
      ready: Boolean(runtime) && !loading,
      loading,
      error,
      ledgerEntries,
      memberBalances,
      personalTotals,
      syncSummary,
      setLedgerUserId,
      refresh,
      retryBoot,
      syncedDataResetVersion,
    }),
    [
      error,
      ledgerEntries,
      loading,
      memberBalances,
      personalTotals,
      refresh,
      retryBoot,
      runtime,
      snapshot,
      syncSummary,
      syncedDataResetVersion,
    ],
  );

  return (
    <AppDataContextsProvider snapshot={readValue} commands={commands}>
      {children}
    </AppDataContextsProvider>
  );
}

function withBootTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (promiseError) => {
        clearTimeout(timeout);
        reject(promiseError);
      },
    );
  });
}
