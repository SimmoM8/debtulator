import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useBaseCurrencyCode } from "@/src/features/currencies/hooks/useBaseCurrencyCode";
import {
  createMoney,
  isValidPositiveMoneyInput,
} from "@/src/features/currencies/utils/money";
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
  const baseCurrencyCode = useBaseCurrencyCode();
  const [memberId, setMemberId] = useState("");
  const [direction, setDirection] = useState<DebtDirection>("you_owe");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(startOfToday);
  const { createDebt, isCreating } = useCreateDebt();

  const currency = selectedCurrency ?? baseCurrencyCode;

  const canCreate =
    !isCreating &&
    memberId !== "" &&
    title.trim().length > 0 &&
    isValidPositiveMoneyInput(amount) &&
    currency.length > 0 &&
    (!hasDueDate || dueDate >= startOfToday());

  const create = useCallback(async () => {
    if (!canCreate) {
      throw new Error("Cannot create debt: invalid state.");
    }

    await createDebt({
      memberId,
      direction,
      title,
      money: createMoney(amount, currency),
      dueDate: hasDueDate ? dueDate : null,
    });
  }, [
    amount,
    canCreate,
    createDebt,
    currency,
    direction,
    dueDate,
    hasDueDate,
    memberId,
    title,
  ]);

  const reset = useCallback(() => {
    setMemberId("");
    setDirection("you_owe");
    setTitle("");
    setAmount("");
    setSelectedCurrency(null);
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
      setCurrency: setSelectedCurrency,
      setHasDueDate,
      setDueDate,
      canCreate,
      isCreating,
      create,
      reset,
    }),
    [
      amount,
      canCreate,
      create,
      currency,
      direction,
      dueDate,
      hasDueDate,
      isCreating,
      memberId,
      reset,
      title,
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
