import type { PropsWithChildren } from "react";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useCreateDebt } from "@/src/features/debts/hooks/useCreateDebt";
import type { DebtDirection } from "@/src/features/debts/model/Debt";
import { startOfToday } from "@/src/lib/dates";

type NewDebtContextValue = {
  memberId: string;
  direction: DebtDirection;
  title: string;
  amount: string;
  currency: string;
  hasDueDate: boolean;
  dueDate: Date;
  setMemberId: (memberId: string) => void;
  setDirection: (direction: DebtDirection) => void;
  setTitle: (title: string) => void;
  setAmount: (amount: string) => void;
  setCurrency: (currency: string) => void;
  setHasDueDate: (hasDueDate: boolean) => void;
  setDueDate: (dueDate: Date) => void;
  isCreating: boolean;
  canCreate: boolean;
  create: () => Promise<void>;
  reset: () => void;
};

const NewDebtContext = createContext<NewDebtContextValue | null>(null);

export function NewDebtProvider({ children }: PropsWithChildren) {
  const [memberId, setMemberId] = useState(
    "21072ae7-9ce1-443c-af71-ee7f6ea4fabb",
  );

  const [direction, setDirection] = useState<DebtDirection>("you_owe");

  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  const [currency, setCurrency] = useState("SEK");

  const [hasDueDate, setHasDueDate] = useState(false);

  const [dueDate, setDueDate] = useState(startOfToday);

  const { createDebt, isCreating } = useCreateDebt();

  const canCreate = useMemo(() => {
    return (
      memberId !== "" &&
      amount !== "" &&
      (!hasDueDate || dueDate >= startOfToday())
    );
  }, [memberId, amount, hasDueDate, dueDate]);

  const create = useCallback(async () => {
    if (!canCreate) {
      throw new Error("Cannot create debt: invalid state.");
    }

    await createDebt({
      memberId,
      direction,
      title,
      amount: parseFloat(amount),
      currency,
      dueDate: hasDueDate ? dueDate : null,
    });
  }, [
    canCreate,
    createDebt,
    memberId,
    direction,
    title,
    amount,
    currency,
    hasDueDate,
    dueDate,
  ]);

  const reset = useCallback(() => {
    setMemberId("21072ae7-9ce1-443c-af71-ee7f6ea4fabb");
    setDirection("you_owe");
    setTitle("");
    setAmount("");
    setCurrency("SEK");
    setHasDueDate(false);
    setDueDate(startOfToday());
  }, []);

  const value = useMemo<NewDebtContextValue>(
    () => ({
      memberId,
      direction,
      title,
      amount,
      currency,
      hasDueDate,
      dueDate,
      setMemberId,
      setDirection,
      setTitle,
      setAmount,
      setCurrency,
      setHasDueDate,
      setDueDate,
      canCreate,
      isCreating,
      create,
      reset,
    }),
    [
      memberId,
      direction,
      title,
      amount,
      currency,
      hasDueDate,
      dueDate,
      isCreating,
      canCreate,
      create,
      reset,
    ],
  );

  return (
    <NewDebtContext.Provider value={value}>{children}</NewDebtContext.Provider>
  );
}

export function useNewDebt() {
  const context = useContext(NewDebtContext);

  if (!context) {
    throw new Error("useNewDebt must be used inside NewDebtProvider.");
  }

  return context;
}
