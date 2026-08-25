import type { CurrencyCode } from "@/src/domain/models";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useState } from "react";

export type NewDebtDirection = "you_owe" | "they_owe";

type NewDebtDraftContextValue = {
  memberId: string | null;
  setMemberId: (memberId: string | null) => void;

  direction: NewDebtDirection;
  setDirection: (direction: NewDebtDirection) => void;

  title: string;
  setTitle: (title: string) => void;

  amount: string;
  setAmount: (amount: string) => void;

  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;

  hasDueDate: boolean;
  setHasDueDate: (hasDueDate: boolean) => void;

  dueDate: Date;
  setDueDate: (dueDate: Date) => void;

  reset: () => void;
};

const NewDebtDraftContext = createContext<NewDebtDraftContextValue | null>(
  null,
);

export function NewDebtDraftProvider({ children }: PropsWithChildren) {
  const [memberId, setMemberId] = useState<string | null>(null);

  const [direction, setDirection] = useState<NewDebtDirection>("you_owe");

  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  const [currency, setCurrency] = useState<CurrencyCode>("SEK");

  const [hasDueDate, setHasDueDate] = useState(false);

  const [dueDate, setDueDate] = useState(() => startOfToday());

  const value = useMemo<NewDebtDraftContextValue>(
    () => ({
      memberId,
      setMemberId,

      direction,
      setDirection,

      title,
      setTitle,

      amount,
      setAmount,

      currency,
      setCurrency,

      hasDueDate,
      setHasDueDate,

      dueDate,
      setDueDate,

      reset() {
        setMemberId(null);
        setDirection("you_owe");
        setTitle("");
        setAmount("");
        setCurrency("SEK");
        setHasDueDate(false);
        setDueDate(startOfToday());
      },
    }),
    [amount, currency, direction, dueDate, hasDueDate, memberId, title],
  );

  return (
    <NewDebtDraftContext.Provider value={value}>
      {children}
    </NewDebtDraftContext.Provider>
  );
}

export function useNewDebtDraft() {
  const context = useContext(NewDebtDraftContext);

  if (!context) {
    throw new Error("useNewDebtDraft must be used inside NewDebtDraftProvider");
  }

  return context;
}

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}
