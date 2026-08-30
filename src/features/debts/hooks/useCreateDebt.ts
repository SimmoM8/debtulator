import { openDatabase } from "@/src/database/openDatabase";
import { dateToISOString } from "@/src/lib/dates";
import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SqliteDebtRepository } from "../data/SqliteDebtRepository";
import type { DebtDirection } from "../model/Debt";

type CreateDebtInput = {
  direction: DebtDirection;
  memberId: string;
  amount: number;
  currency: string;
  title: string;
  dueDate: Date | null;
};

export function useCreateDebt() {
  const auth = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createDebt = useCallback(
    async (input: CreateDebtInput) => {
      if (!auth.session) {
        throw new Error("Cannot create a debt while signed out.");
      }

      if (input.amount <= 0) {
        throw new Error("Debt amount must be greater than zero.");
      }

      setIsCreating(true);

      try {
        const db = await openDatabase();
        const now = new Date().toISOString();
        const repository = new SqliteDebtRepository(db);

        await repository.save({
          id: Crypto.randomUUID(),
          ownerUserId: auth.session.user.id,
          memberId: input.memberId,
          direction: input.direction,
          amount: input.amount,
          currency: input.currency,
          title: input.title.trim(),
          dueDate: input.dueDate ? dateToISOString(input.dueDate) : null,
          createdAt: now,
          updatedAt: now,
        });
      } finally {
        setIsCreating(false);
      }
    },
    [auth.session],
  );

  return {
    createDebt,
    isCreating,
  };
}
