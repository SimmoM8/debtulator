import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";

import { emitDataChanged } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { SqliteSyncStore } from "@/src/data/sync/SqliteSyncStore";
import { requestSync } from "@/src/data/sync/syncSignal";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { SqliteCurrencyRepository } from "@/src/features/currencies/data/SqliteCurrencyRepository";
import type { Money } from "@/src/features/currencies/model/Money";
import {
  createMoney,
  hasAllowedDecimalPlaces,
  hasAllowedIntegerDigits,
  isPositiveMoney,
} from "@/src/features/currencies/utils/money";
import { SqliteDebtRepository } from "@/src/features/debts/data/SqliteDebtRepository";
import type { Debt, DebtDirection } from "@/src/features/debts/model/Debt";
import { debtToCreateSyncPayload } from "@/src/features/debts/utils/debtMapper";
import { toDateString } from "@/src/lib/dates";

type CreateDebtInput = {
  direction: DebtDirection;
  memberId: string;
  money: Money;
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

      const ownerUserId = auth.session.user.id;
      const money = createMoney(input.money.amount, input.money.currencyCode);

      if (!isPositiveMoney(money)) {
        throw new Error("Debt amount must be greater than zero.");
      }

      if (!hasAllowedIntegerDigits(money)) {
        throw new Error("Debt amount may contain at most 30 integer digits.");
      }

      setIsCreating(true);

      try {
        const db = await openDatabase();
        const now = new Date().toISOString();

        await db.withExclusiveTransactionAsync(async (tx) => {
          const member = await tx.getFirstAsync<{ linked_user_id: string | null }>(
            `
              SELECT linked_user_id
              FROM members
              WHERE owner_user_id = ?
                AND id = ?
              LIMIT 1
            `,
            [ownerUserId, input.memberId],
          );

          if (!member) {
            throw new Error("The selected member does not exist.");
          }

          const debt: Debt = {
            id: Crypto.randomUUID(),
            ownerUserId,
            memberId: input.memberId,
            direction: input.direction,
            money,
            title: input.title.trim(),
            dueDate: input.dueDate ? toDateString(input.dueDate) : null,
            createdAt: now,
            updatedAt: now,
            agreementStatus: member.linked_user_id ? "pending" : "private",
            collaborationId: null,
            agreedRevision: null,
            version: null,
          };

          const currencyRepository = new SqliteCurrencyRepository(tx);
          const currency = await currencyRepository.getByCode(
            debt.money.currencyCode,
          );

          if (!currency || !currency.enabled) {
            throw new Error("The selected currency is not available.");
          }

          if (!hasAllowedDecimalPlaces(debt.money, currency)) {
            throw new Error(
              `${currency.code} supports at most ${currency.decimalPlaces} decimal places.`,
            );
          }

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
