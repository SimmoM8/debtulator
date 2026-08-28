import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CoreDataDependencies } from "@/src/application/core/CoreDataDependencies";
import {
  createDebt as createDebtUseCase,
  type CreateDebtInput as ApplicationCreateDebtInput,
} from "@/src/application/debts/createDebt";
import { getDebts } from "@/src/application/debts/getDebts";
import {
  createMember as createMemberUseCase,
  type CreateMemberInput as ApplicationCreateMemberInput,
} from "@/src/application/members/createMember";
import { getMembers } from "@/src/application/members/getMembers";
import type { Debt } from "@/src/domain/debts/Debt";
import type { Member } from "@/src/domain/members/Member";
import type { ResourceState } from "@/src/presentation/model/ResourceState";

type CreateDebtInput = Omit<ApplicationCreateDebtInput, "ownerUserId">;
type CreateMemberInput = Omit<ApplicationCreateMemberInput, "ownerUserId">;

type CoreDataContextValue = {
  debts: ResourceState<Debt[]>;
  members: ResourceState<Member[]>;
  ready: boolean;
  refresh: () => Promise<void>;
  createDebt: (input: CreateDebtInput) => Promise<Debt>;
  createMember: (input: CreateMemberInput) => Promise<Member>;
};

type CoreDataProviderProps = PropsWithChildren<{
  ownerUserId: string;
  dependencies: CoreDataDependencies;
}>;

type ResourceDataState<T> = Omit<ResourceState<T>, "refresh">;

const CoreDataContext = createContext<CoreDataContextValue | null>(null);

export function CoreDataProvider({
  children,
  ownerUserId,
  dependencies,
}: CoreDataProviderProps) {
  const [debtsState, setDebtsState] = useState<ResourceDataState<Debt[]>>({
    data: [],
    loading: true,
    error: null,
  });

  const [membersState, setMembersState] = useState<ResourceDataState<Member[]>>({
    data: [],
    loading: true,
    error: null,
  });

  const loadDebts = useCallback(async () => {
    try {
      const debts = await getDebts(dependencies.debts, ownerUserId);

      setDebtsState({
        data: debts,
        loading: false,
        error: null,
      });
    } catch (error) {
      setDebtsState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error, "Unable to load debts."),
      }));

      throw error;
    }
  }, [dependencies.debts, ownerUserId]);

  const loadMembers = useCallback(async () => {
    try {
      const members = await getMembers(dependencies.members, ownerUserId);

      setMembersState({
        data: members,
        loading: false,
        error: null,
      });
    } catch (error) {
      setMembersState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error, "Unable to load members."),
      }));

      throw error;
    }
  }, [dependencies.members, ownerUserId]);

  useEffect(() => {
    void loadDebts().catch(() => undefined);
    void loadMembers().catch(() => undefined);
  }, [loadDebts, loadMembers]);

  const refreshDebts = useCallback(async () => {
    setDebtsState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    await loadDebts();
  }, [loadDebts]);

  const refreshMembers = useCallback(async () => {
    setMembersState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    await loadMembers();
  }, [loadMembers]);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      refreshDebts(),
      refreshMembers(),
    ]);

    const rejected = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    );

    if (rejected) {
      throw rejected.reason;
    }
  }, [refreshDebts, refreshMembers]);

  const createDebt = useCallback(
    async (input: CreateDebtInput) => {
      const debt = await createDebtUseCase(dependencies.debts, {
        ...input,
        ownerUserId,
      });

      await loadDebts();

      return debt;
    },
    [dependencies.debts, loadDebts, ownerUserId],
  );

  const createMember = useCallback(
    async (input: CreateMemberInput) => {
      const member = await createMemberUseCase(dependencies.members, {
        ...input,
        ownerUserId,
      });

      await loadMembers();

      return member;
    },
    [dependencies.members, loadMembers, ownerUserId],
  );

  const debts = useMemo<ResourceState<Debt[]>>(
    () => ({
      ...debtsState,
      refresh: refreshDebts,
    }),
    [debtsState, refreshDebts],
  );

  const members = useMemo<ResourceState<Member[]>>(
    () => ({
      ...membersState,
      refresh: refreshMembers,
    }),
    [membersState, refreshMembers],
  );

  const ready = !debts.loading && !members.loading;

  const value = useMemo<CoreDataContextValue>(
    () => ({
      debts,
      members,
      ready,
      refresh,
      createDebt,
      createMember,
    }),
    [createDebt, createMember, debts, members, ready, refresh],
  );

  return (
    <CoreDataContext.Provider value={value}>
      {children}
    </CoreDataContext.Provider>
  );
}

export function useCoreData() {
  const value = useContext(CoreDataContext);

  if (!value) {
    throw new Error("useCoreData must be used inside CoreDataProvider.");
  }

  return value;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
