import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  type DatabaseSnapshot,
  loadSnapshot,
  openDebtulatorDatabase,
} from '@/src/data/database';
import { DebtulatorRepository } from '@/src/data/repositories';
import { buildLedgerEntries, calculateMemberBalances, calculatePersonalTotals } from '@/src/services/ledger';
import type {
  AppSettings,
  CurrencyCode,
  Debt,
  DebtStatus,
  Event,
  EventStatus,
  LedgerEntry,
  Member,
  MoneyMap,
  ParticipantId,
  SharedExpense,
  VerificationStatus,
} from '@/src/types/models';

type CreateMemberInput = {
  displayName: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
};

type CreateDebtInput = {
  memberId: string;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  debtDate?: string;
  dueDate?: string | null;
  tags?: string[];
  eventId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
};

type CreateEventInput = {
  name: string;
  notes?: string | null;
  defaultCurrency: CurrencyCode;
  tags?: string[];
  status?: EventStatus;
  memberIds?: string[];
};

type CreateExpenseInput = {
  eventId: string;
  payerId: ParticipantId;
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  expenseDate?: string;
  participantIds: ParticipantId[];
  tags?: string[];
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
};

type AppDataContextValue = DatabaseSnapshot & {
  ready: boolean;
  loading: boolean;
  error: string | null;
  ledgerEntries: LedgerEntry[];
  memberBalances: Record<string, MoneyMap>;
  personalTotals: ReturnType<typeof calculatePersonalTotals>;
  refresh: () => Promise<void>;
  resetLocalData: (seed?: boolean) => Promise<void>;
  createMember: (input: CreateMemberInput) => Promise<Member>;
  updateMember: (memberId: string, input: Partial<CreateMemberInput> & { archived?: boolean }) => Promise<Member>;
  createDebt: (input: CreateDebtInput) => Promise<Debt>;
  updateDebt: (debtId: string, input: Partial<CreateDebtInput>) => Promise<Debt>;
  createEvent: (input: CreateEventInput) => Promise<Event>;
  updateEvent: (
    eventId: string,
    input: Partial<CreateEventInput> & { archived?: boolean; ignoredDuplicateKeys?: string[] },
  ) => Promise<Event>;
  setEventMembers: (eventId: string, memberIds: string[]) => Promise<void>;
  createSharedExpense: (input: CreateExpenseInput) => Promise<SharedExpense>;
  updateSharedExpense: (expenseId: string, input: Partial<CreateExpenseInput>) => Promise<SharedExpense>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateRate: (currency: CurrencyCode, rateToSek: number) => Promise<void>;
};

const emptySnapshot: DatabaseSnapshot = {
  members: [],
  debts: [],
  events: [],
  eventMembers: [],
  sharedExpenses: [],
  tags: [],
  currencyRates: [],
  settings: {
    baseCurrency: 'SEK',
    showEstimatedBase: true,
    theme: 'system',
  },
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot>(emptySnapshot);
  const [repository, setRepository] = useState<DebtulatorRepository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const db = await openDebtulatorDatabase();
        const repo = new DebtulatorRepository(db);
        const loaded = await loadSnapshot(db);

        if (mounted) {
          setRepository(repo);
          setSnapshot(loaded);
          setError(null);
        }
      } catch (bootError) {
        if (mounted) {
          setError(bootError instanceof Error ? bootError.message : 'Unable to open local database');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!repository) {
      return;
    }

    setSnapshot(await repository.load());
  }, [repository]);

  const runAndRefresh = useCallback(
    async <T,>(operation: (repo: DebtulatorRepository) => Promise<T>) => {
      if (!repository) {
        throw new Error('Local database is not ready yet.');
      }

      const result = await operation(repository);
      setSnapshot(await repository.load());
      return result;
    },
    [repository],
  );

  const ledgerEntries = useMemo(
    () => buildLedgerEntries(snapshot.debts, snapshot.sharedExpenses),
    [snapshot.debts, snapshot.sharedExpenses],
  );
  const memberBalances = useMemo(() => calculateMemberBalances(ledgerEntries), [ledgerEntries]);
  const personalTotals = useMemo(() => calculatePersonalTotals(ledgerEntries), [ledgerEntries]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...snapshot,
      ready: Boolean(repository) && !loading,
      loading,
      error,
      ledgerEntries,
      memberBalances,
      personalTotals,
      refresh,
      resetLocalData: async (seed = true) => {
        await runAndRefresh((repo) => repo.reset(seed));
      },
      createMember: (input) => runAndRefresh((repo) => repo.createMember(input)),
      updateMember: (memberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.updateMember(member, input);
        }),
      createDebt: (input) => runAndRefresh((repo) => repo.createDebt(input)),
      updateDebt: (debtId, input) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.updateDebt(debt, input);
        }),
      createEvent: (input) => runAndRefresh((repo) => repo.createEvent(input)),
      updateEvent: (eventId, input) =>
        runAndRefresh((repo) => {
          const event = snapshot.events.find((item) => item.id === eventId);
          if (!event) {
            throw new Error('Event not found.');
          }
          return repo.updateEvent(event, input);
        }),
      setEventMembers: async (eventId, memberIds) => {
        await runAndRefresh((repo) => repo.setEventMembers(eventId, memberIds));
      },
      createSharedExpense: (input) => runAndRefresh((repo) => repo.createSharedExpense(input)),
      updateSharedExpense: (expenseId, input) =>
        runAndRefresh((repo) => {
          const expense = snapshot.sharedExpenses.find((item) => item.id === expenseId);
          if (!expense) {
            throw new Error('Expense not found.');
          }
          return repo.updateSharedExpense(expense, input);
        }),
      updateSettings: async (settings) => {
        await runAndRefresh((repo) => repo.updateSettings(settings));
      },
      updateRate: async (currency, rateToSek) => {
        await runAndRefresh((repo) => repo.updateRate(currency, rateToSek));
      },
    }),
    [
      error,
      ledgerEntries,
      loading,
      memberBalances,
      personalTotals,
      refresh,
      repository,
      runAndRefresh,
      snapshot,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return value;
}
