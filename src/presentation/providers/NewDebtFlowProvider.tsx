import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { Member } from "@/src/domain/models";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { useNewDebtDraft } from "@/src/presentation/providers/NewDebtDraftProvider";

type NewDebtFlowContextValue = {
  selectedMember: Member | null;

  parsedAmount: number;

  canCreate: boolean;

  isCreating: boolean;

  createDebt: () => Promise<void>;
};

const NewDebtFlowContext = createContext<NewDebtFlowContextValue | null>(null);

export function NewDebtFlowProvider({ children }: PropsWithChildren) {
  const data = useAppData();

  const draft = useNewDebtDraft();

  const [isCreating, setIsCreating] = useState(false);

  const selectedMember = useMemo(
    () => data.members.find((member) => member.id === draft.memberId) ?? null,
    [data.members, draft.memberId],
  );

  const parsedAmount = useMemo(() => {
    if (draft.amount.length === 0 || draft.amount === ".") {
      return 0;
    }

    const parsed = Number(draft.amount);

    return Number.isFinite(parsed) ? parsed : 0;
  }, [draft.amount]);

  const canCreate =
    !isCreating &&
    selectedMember !== null &&
    draft.title.trim().length > 0 &&
    parsedAmount > 0;

  const createDebt = useCallback(async () => {
    if (
      isCreating ||
      selectedMember === null ||
      draft.title.trim().length === 0 ||
      parsedAmount <= 0
    ) {
      return;
    }

    setIsCreating(true);

    try {
      await data.createDebt({
        memberId: selectedMember.id,

        direction: draft.direction,

        amount: parsedAmount,

        currency: draft.currency,

        title: draft.title.trim(),

        dueDate: draft.hasDueDate ? toDateString(draft.dueDate) : null,
      });
    } finally {
      setIsCreating(false);
    }
  }, [
    data,
    draft.currency,
    draft.direction,
    draft.dueDate,
    draft.hasDueDate,
    draft.title,
    isCreating,
    parsedAmount,
    selectedMember,
  ]);

  const value = useMemo<NewDebtFlowContextValue>(
    () => ({
      selectedMember,

      parsedAmount,

      canCreate,

      isCreating,

      createDebt,
    }),
    [canCreate, createDebt, isCreating, parsedAmount, selectedMember],
  );

  return (
    <NewDebtFlowContext.Provider value={value}>
      {children}
    </NewDebtFlowContext.Provider>
  );
}

export function useNewDebtFlow() {
  const context = useContext(NewDebtFlowContext);

  if (!context) {
    throw new Error("useNewDebtFlow must be used inside NewDebtFlowProvider.");
  }

  return context;
}

function toDateString(date: Date) {
  const year = date.getFullYear();

  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
