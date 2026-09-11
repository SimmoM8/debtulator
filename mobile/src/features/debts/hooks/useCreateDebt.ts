import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";

import { emitDataChanged } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { SqliteSyncStore } from "@/src/data/sync/SqliteSyncStore";
import { requestSync } from "@/src/data/sync/syncSignal";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { SqliteDebtRepository } from "@/src/features/debts/data/SqliteDebtRepository";
import type {
  Debt,
  DebtDirection,
} from "@/src/features/debts/model/Debt";
import { debtToCreateSyncPayload } from "@/src/features/debts/utils/debtMapper";
import { toDateString } from "@/src/lib/dates";

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

      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error("Debt amount must be greater than zero.");
      }

      setIsCreating(true);

      try {
        const db = await openDatabase();
        const now = new Date().toISOString();

        const debt: Debt = {
          id: Crypto.randomUUID(),
          ownerUserId: auth.session.user.id,
          memberId: input.memberId,
          direction: input.direction,
          amount: input.amount,
          currency: input.currency,
          title: input.title.trim(),
          dueDate: input.dueDate ? toDateString(input.dueDate) : null,
          createdAt: now,
          updatedAt: now,
          version: null,
        };

        await db.withExclusiveTransactionAsync(async (tx) => {
          const repository = new SqliteDebtRepository(tx);
          const syncStore = new SqliteSyncStore(tx);

          await repository.save(debt);

          await syncStore.enqueue({
            id: Crypto.randomUUID(),
            ownerUserId: debt.ownerUserId,
            entityType: "debt",
            entityId: debt.id,
            operation: "upsert",
            baseVersion: null,
            payload: debtToCreateSyncPayload(debt),
            createdAt: now,
          });
        });

        emitDataChanged("debts");
        requestSync();
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
