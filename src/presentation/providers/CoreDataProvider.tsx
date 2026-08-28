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
import type { CoreSnapshot } from "@/src/application/model/CoreSnapshot";
import type { Debt } from "@/src/domain/debts/Debt";
import type { Member } from "@/src/domain/members/Member";

type CreateDebtInput = Omit<ApplicationCreateDebtInput, "ownerUserId">;
type CreateMemberInput = Omit<ApplicationCreateMemberInput, "ownerUserId">;

type CoreDataContextValue = CoreSnapshot & {
  ready: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDebt: (input: CreateDebtInput) => Promise<Debt>;
  createMember: (input: CreateMemberInput) => Promise<Member>;
};

type CoreDataProviderProps = PropsWithChildren<{
  ownerUserId: string;
  dependencies: CoreDataDependencies;
}>;

const EMPTY_SNAPSHOT: CoreSnapshot = {
  debts: [],
  members: [],
};

const CoreDataContext = createContext<CoreDataContextValue | null>(null);

export function CoreDataProvider({
  children,
  ownerUserId,
  dependencies,
}: CoreDataProviderProps) {
  const [snapshot, setSnapshot] = useState<CoreSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (): Promise<CoreSnapshot> => {
    const [members, debts] = await Promise.all([
      getMembers(dependencies.members, ownerUserId),
      getDebts(dependencies.debts, ownerUserId),
    ]);

    return {
      members,
      debts,
    };
  }, [dependencies, ownerUserId]);

  useEffect(() => {
    let cancelled = false;

    void loadSnapshot()
      .then((nextSnapshot) => {
        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load local data.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadSnapshot]);

  const refresh = useCallback(async () => {
    const nextSnapshot = await loadSnapshot();
    setSnapshot(nextSnapshot);
  }, [loadSnapshot]);

  const createDebt = useCallback(
    async (input: CreateDebtInput) => {
      const debt = await createDebtUseCase(dependencies.debts, {
        ...input,
        ownerUserId,
      });

      await refresh();

      return debt;
    },
    [dependencies.debts, ownerUserId, refresh],
  );

  const createMember = useCallback(
    async (input: CreateMemberInput) => {
      const member = await createMemberUseCase(dependencies.members, {
        ...input,
        ownerUserId,
      });

      await refresh();

      return member;
    },
    [dependencies.members, ownerUserId, refresh],
  );

  const value = useMemo<CoreDataContextValue>(
    () => ({
      ...snapshot,
      ready: !loading && error === null,
      loading,
      error,
      refresh,
      createDebt,
      createMember,
    }),
    [createDebt, createMember, error, loading, refresh, snapshot],
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
