import type { CurrencyCode, DebtDirection } from "@/src/domain/models";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo, useState } from "react";

type NewDebtDraftContextValue = {
  memberId: string | null;
  setMemberId: (memberId: string | null) => void;

  direction: DebtDirection;
  setDirection: (direction: DebtDirection) => void;

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
  const { settings } = useAppData();

  const [memberId, setMemberId] = useState<string | null>(null);

  const [direction, setDirection] = useState<DebtDirection>("you_owe");

  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  /*
   * The user's configured app/account currency is the default
   * for each new debt flow.
   *
   * This is deliberately initialised once when the provider mounts.
   * If settings change while the user is halfway through this form,
   * we do NOT unexpectedly overwrite their currently selected currency.
   */
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => settings.baseCurrency,
  );

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

        /*
         * Reset to the user's CURRENT configured currency rather
         * than a hardcoded fallback.
         */
        setCurrency(settings.baseCurrency);

        setHasDueDate(false);
        setDueDate(startOfToday());
      },
    }),
    [
      amount,
      currency,
      direction,
      dueDate,
      hasDueDate,
      memberId,
      settings.baseCurrency,
      title,
    ],
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
