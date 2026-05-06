import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

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
  DebtVerification,
  DebtStatus,
  Event,
  EventStatus,
  LedgerEntry,
  LinkRequest,
  Member,
  MoneyMap,
  ParticipantId,
  SharedExpense,
  SuggestedDebtChange,
  VerificationStatus,
  UserProfile,
} from '@/src/types/models';

type CreateMemberInput = {
  displayName: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedUserId?: string | null;
  linkStatus?: Member['linkStatus'];
  linkedProfileDisplayName?: string | null;
  linkedProfileEmail?: string | null;
  linkedProfilePhone?: string | null;
  tags?: string[];
};

type CreateDebtInput = {
  memberId: string;
  direction: Debt['direction'];
  amount: number;
  currency: CurrencyCode;
  title: string;
  notes?: string | null;
  sharedNotes?: string | null;
  debtDate?: string;
  dueDate?: string | null;
  tags?: string[];
  eventId?: string | null;
  status?: DebtStatus;
  verificationStatus?: VerificationStatus;
  visibility?: Debt['visibility'];
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
  upsertProfile: (profile: UserProfile) => Promise<UserProfile>;
  upsertLinkRequest: (linkRequest: LinkRequest) => Promise<LinkRequest>;
  upsertDebtVerification: (verification: DebtVerification) => Promise<DebtVerification>;
  upsertDebt: (debt: Debt) => Promise<Debt>;
  createMember: (input: CreateMemberInput) => Promise<Member>;
  updateMember: (memberId: string, input: Partial<CreateMemberInput> & { archived?: boolean }) => Promise<Member>;
  sendMemberLinkRequest: (
    memberId: string,
    input: {
      requesterUserId: string;
      targetUserId?: string | null;
      targetEmail?: string | null;
      targetPhone?: string | null;
      message?: string | null;
      remoteId?: string | null;
    },
  ) => Promise<LinkRequest>;
  respondToLinkRequest: (
    requestId: string,
    status: Extract<LinkRequest['status'], 'accepted' | 'rejected' | 'cancelled'>,
    actorUserId: string,
  ) => Promise<LinkRequest>;
  unlinkMember: (memberId: string, actorUserId?: string | null) => Promise<Member>;
  createDebt: (input: CreateDebtInput) => Promise<Debt>;
  updateDebt: (debtId: string, input: Partial<CreateDebtInput>) => Promise<Debt>;
  requestDebtVerification: (
    debtId: string,
    input: {
      requesterUserId: string;
      responderUserId: string;
      remoteDebtId?: string | null;
      remoteVerificationId?: string | null;
      sharedNotes?: string | null;
    },
  ) => Promise<{ debt: Debt; verification: DebtVerification }>;
  respondToDebtVerification: (
    verificationId: string,
    status: Extract<VerificationStatus, 'verified' | 'rejected'>,
    actorUserId: string,
    rejectionReason?: string | null,
    suggestedChange?: SuggestedDebtChange | null,
  ) => Promise<{ debt: Debt; verification: DebtVerification }>;
  markDebtDisputed: (debtId: string, actorUserId?: string | null, disputeReason?: string | null) => Promise<Debt>;
  markDebtResolved: (debtId: string, actorUserId?: string | null, resolutionNote?: string | null) => Promise<Debt>;
  cancelDebtVerification: (debtId: string, actorUserId?: string | null) => Promise<Debt>;
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
  profiles: [],
  members: [],
  debts: [],
  events: [],
  eventMembers: [],
  sharedExpenses: [],
  linkRequests: [],
  debtVerifications: [],
  activityLogs: [],
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
        const { repo, loaded } = await withBootTimeout(
          (async () => {
            const db = await openDebtulatorDatabase();
            return {
              repo: new DebtulatorRepository(db),
              loaded: await loadSnapshot(db),
            };
          })(),
          Platform.OS === 'web' ? 6000 : 20000,
          'Local database boot timed out. Continuing in local preview mode.',
        );

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
      upsertProfile: (profile) => runAndRefresh((repo) => repo.upsertProfile(profile)),
      upsertLinkRequest: (linkRequest) => runAndRefresh((repo) => repo.upsertLinkRequest(linkRequest)),
      upsertDebtVerification: (verification) => runAndRefresh((repo) => repo.upsertDebtVerification(verification)),
      upsertDebt: (debt) => runAndRefresh((repo) => repo.upsertDebt(debt)),
      createMember: (input) => runAndRefresh((repo) => repo.createMember(input)),
      updateMember: (memberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.updateMember(member, input);
        }),
      sendMemberLinkRequest: (memberId, input) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.sendMemberLinkRequest({ member, ...input });
        }),
      respondToLinkRequest: (requestId, status, actorUserId) =>
        runAndRefresh((repo) => {
          const linkRequest = snapshot.linkRequests.find((item) => item.id === requestId);
          if (!linkRequest) {
            throw new Error('Link request not found.');
          }
          return repo.respondToLinkRequest(linkRequest, status, actorUserId);
        }),
      unlinkMember: (memberId, actorUserId = null) =>
        runAndRefresh((repo) => {
          const member = snapshot.members.find((item) => item.id === memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.unlinkMember(member, actorUserId);
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
      requestDebtVerification: (debtId, input) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          const member = snapshot.members.find((item) => item.id === debt.memberId);
          if (!member) {
            throw new Error('Member not found.');
          }
          return repo.requestDebtVerification({ debt, member, ...input });
        }),
      respondToDebtVerification: (verificationId, status, actorUserId, rejectionReason, suggestedChange) =>
        runAndRefresh((repo) => {
          const verification = snapshot.debtVerifications.find((item) => item.id === verificationId);
          if (!verification) {
            throw new Error('Verification request not found.');
          }
          const debt = snapshot.debts.find((item) => item.id === verification.debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.respondToDebtVerification(verification, debt, status, actorUserId, rejectionReason, suggestedChange);
        }),
      markDebtDisputed: (debtId, actorUserId = null, disputeReason = null) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.markDebtDisputed(debt, actorUserId, disputeReason);
        }),
      markDebtResolved: (debtId, actorUserId = null, resolutionNote = null) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          return repo.markDebtResolved(debt, actorUserId, resolutionNote);
        }),
      cancelDebtVerification: (debtId, actorUserId = null) =>
        runAndRefresh((repo) => {
          const debt = snapshot.debts.find((item) => item.id === debtId);
          if (!debt) {
            throw new Error('Debt not found.');
          }
          const verification = debt.verificationRequestId
            ? snapshot.debtVerifications.find((item) => item.id === debt.verificationRequestId)
            : undefined;
          return repo.cancelDebtVerification(debt, verification, actorUserId);
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

function withBootTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return value;
}
