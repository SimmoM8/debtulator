import type { SQLiteDatabase } from "expo-sqlite";

import { emitDataChanged, type DataResource } from "@/src/data/sqlite/dataChanges";
import { SqliteDebtRepository } from "@/src/features/debts/data/SqliteDebtRepository";
import { syncPayloadToDebt } from "@/src/features/debts/utils/debtMapper";
import { SqliteMemberRepository } from "@/src/features/members/data/SqliteMemberRepository";
import { syncPayloadToMember } from "@/src/features/members/utils/memberMapper";

import {
  BackendSyncGateway,
  SyncCursorExpiredError,
} from "./BackendSyncGateway";
import { SqliteSyncStore } from "./SqliteSyncStore";
import type {
  RemoteSyncChange,
  SyncBootstrapItem,
  SyncEntityType,
  SyncMutation,
  SyncMutationResult,
} from "./syncTypes";

export class SyncBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncBlockedError";
  }
}

export class SyncEngine {
  private runningPromise: Promise<void> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly remote: BackendSyncGateway,
  ) {}

  sync(ownerUserId: string): Promise<void> {
    if (this.runningPromise) {
      this.rerunRequested = true;
      return this.runningPromise;
    }

    this.runningPromise = this.runUntilSettled(ownerUserId).finally(() => {
      this.runningPromise = null;
    });

    return this.runningPromise;
  }

  private async runUntilSettled(ownerUserId: string): Promise<void> {
    do {
      this.rerunRequested = false;
      await this.performSync(ownerUserId);
    } while (this.rerunRequested);
  }

  private async performSync(ownerUserId: string): Promise<void> {
    await this.push(ownerUserId);

    const syncStore = new SqliteSyncStore(this.db);

    if (await syncStore.hasBlockingFailure(ownerUserId)) {
      throw new SyncBlockedError(
        "Synchronization is blocked by a conflict or rejected local change.",
      );
    }

    if (!(await syncStore.isBootstrapCompleted(ownerUserId))) {
      await this.bootstrap(ownerUserId);
    }

    try {
      await this.pull(ownerUserId);
    } catch (error) {
      if (!(error instanceof SyncCursorExpiredError)) {
        throw error;
      }

      await syncStore.requireBootstrap(ownerUserId);
      await this.bootstrap(ownerUserId);
      await this.pull(ownerUserId);
    }
  }

  private async push(ownerUserId: string): Promise<void> {
    const syncStore = new SqliteSyncStore(this.db);

    while (true) {
      const mutations = await syncStore.getPending(ownerUserId);

      if (mutations.length === 0) {
        return;
      }

      for (const storedMutation of mutations) {
        const mutation = await this.prepareMutation(
          syncStore,
          storedMutation,
        );

        let result: SyncMutationResult;

        try {
          result = await this.remote.pushMutation(mutation);
        } catch (error) {
          const message = getErrorMessage(error);
          await syncStore.markRetry(mutation.id, message);
          throw error;
        }

        await this.applyMutationResult(mutation, result);

        if (result.status === "conflict" || result.status === "rejected") {
          throw new SyncBlockedError(
            result.message ??
              `Synchronization ${result.status} for ${result.entityType} ${result.entityId}.`,
          );
        }

        if (result.status === "retry") {
          throw new Error(
            result.message ?? "The backend asked the mutation to be retried.",
          );
        }
      }
    }
  }

  private async prepareMutation(
    syncStore: SqliteSyncStore,
    mutation: SyncMutation,
  ): Promise<SyncMutation> {
    if (mutation.attemptCount > 0) {
      return mutation;
    }

    const localVersion = await syncStore.getEntityVersion(
      mutation.ownerUserId,
      mutation.entityType,
      mutation.entityId,
    );

    if (localVersion === null || localVersion === mutation.baseVersion) {
      return mutation;
    }

    await syncStore.updateBaseVersion(mutation.id, localVersion);

    return {
      ...mutation,
      baseVersion: localVersion,
    };
  }

  private async applyMutationResult(
    mutation: SyncMutation,
    result: SyncMutationResult,
  ): Promise<void> {
    if (
      result.entityType !== mutation.entityType ||
      result.entityId !== mutation.entityId
    ) {
      throw new Error("Backend sync result does not match the local mutation.");
    }

    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const syncStore = new SqliteSyncStore(tx);

      switch (result.status) {
        case "applied":
          await syncStore.markApplied(mutation, result.version);
          return;

        case "conflict":
          await syncStore.markConflict(
            mutation.id,
            result.errorCode,
            result.message ?? "The remote record changed.",
          );
          return;

        case "rejected":
          await syncStore.markRejected(
            mutation.id,
            result.errorCode,
            result.message ?? "The backend rejected the local change.",
          );
          return;

        case "retry":
          await syncStore.markRetry(
            mutation.id,
            result.message ?? "Temporary synchronization failure.",
          );
      }
    });
  }

  private async bootstrap(ownerUserId: string): Promise<void> {
    const start = await this.remote.startBootstrap();

    const memberItems = start.entityTypes.includes("member")
      ? await this.getCompleteBootstrap("member")
      : [];

    const debtItems = start.entityTypes.includes("debt")
      ? await this.getCompleteBootstrap("debt")
      : [];

    const changedResources = new Set<DataResource>();

    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const memberRepository = new SqliteMemberRepository(tx);
      const debtRepository = new SqliteDebtRepository(tx);
      const syncStore = new SqliteSyncStore(tx);

      await tx.runAsync(
        "DELETE FROM debts WHERE owner_user_id = ?",
        [ownerUserId],
      );
      await tx.runAsync(
        "DELETE FROM members WHERE owner_user_id = ?",
        [ownerUserId],
      );

      for (const item of memberItems) {
        const member = syncPayloadToMember(item.payload);

        assertBootstrapIdentity(
          "member",
          ownerUserId,
          item,
          member.id,
          member.ownerUserId,
          member.version,
        );

        await memberRepository.save(member);
      }

      for (const item of debtItems) {
        const debt = syncPayloadToDebt(item.payload);

        assertBootstrapIdentity(
          "debt",
          ownerUserId,
          item,
          debt.id,
          debt.ownerUserId,
          debt.version,
        );

        await debtRepository.save(debt);
      }

      await syncStore.completeBootstrap(ownerUserId, start.cursor);

      changedResources.add("members");
      changedResources.add("debts");
    });

    emitChanges(changedResources);
  }

  private async getCompleteBootstrap(
    entityType: SyncEntityType,
  ): Promise<SyncBootstrapItem[]> {
    const items: SyncBootstrapItem[] = [];
    let afterId: string | null = null;

    while (true) {
      const page = await this.remote.getBootstrapPage(
        entityType,
        afterId,
      );

      items.push(...page.items);

      if (!page.hasMore) {
        return items;
      }

      if (!page.nextAfterId || page.nextAfterId === afterId) {
        throw new Error("Backend returned an invalid bootstrap cursor.");
      }

      afterId = page.nextAfterId;
    }
  }

  private async pull(ownerUserId: string): Promise<void> {
    const syncStore = new SqliteSyncStore(this.db);

    while (true) {
      const cursor = await syncStore.getLastRemoteSequence(ownerUserId);
      const response = await this.remote.getChangesAfter(cursor);

      if (response.changes.length === 0 && response.hasMore) {
        throw new Error("Backend returned an empty non-final sync page.");
      }

      if (response.changes.length > 0) {
        await this.applyChangeBatch(
          ownerUserId,
          response.changes,
          response.nextCursor,
        );
      } else if (response.nextCursor !== cursor) {
        await this.db.withExclusiveTransactionAsync(async (tx) => {
          await new SqliteSyncStore(tx).setLastRemoteSequence(
            ownerUserId,
            response.nextCursor,
          );
        });
      }

      if (!response.hasMore) {
        return;
      }
    }
  }

  private async applyChangeBatch(
    ownerUserId: string,
    changes: RemoteSyncChange[],
    nextCursor: string,
  ): Promise<void> {
    const changedResources = new Set<DataResource>();

    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const memberRepository = new SqliteMemberRepository(tx);
      const debtRepository = new SqliteDebtRepository(tx);
      const syncStore = new SqliteSyncStore(tx);

      for (const change of changes) {
        switch (change.entityType) {
          case "member":
            if (change.operation === "delete") {
              await memberRepository.delete(ownerUserId, change.entityId);
            } else {
              if (!change.payload) {
                throw new Error("Missing member sync payload.");
              }

              const member = syncPayloadToMember(change.payload);

              assertRemoteIdentity(
                ownerUserId,
                change.entityId,
                member.id,
                member.ownerUserId,
              );

              await memberRepository.save(member);
            }

            changedResources.add("members");
            break;

          case "debt":
            if (change.operation === "delete") {
              await debtRepository.delete(ownerUserId, change.entityId);
            } else {
              if (!change.payload) {
                throw new Error("Missing debt sync payload.");
              }

              const debt = syncPayloadToDebt(change.payload);

              assertRemoteIdentity(
                ownerUserId,
                change.entityId,
                debt.id,
                debt.ownerUserId,
              );

              await debtRepository.save(debt);
            }

            changedResources.add("debts");
            break;
        }
      }

      await syncStore.setLastRemoteSequence(ownerUserId, nextCursor);
    });

    emitChanges(changedResources);
  }
}

function assertBootstrapIdentity(
  entityType: SyncEntityType,
  ownerUserId: string,
  item: SyncBootstrapItem,
  payloadId: string,
  payloadOwnerUserId: string,
  payloadVersion: number | null,
): void {
  if (
    item.entityId !== payloadId ||
    payloadOwnerUserId !== ownerUserId ||
    payloadVersion !== item.version
  ) {
    throw new Error(`Invalid ${entityType} bootstrap payload.`);
  }
}

function assertRemoteIdentity(
  ownerUserId: string,
  changeEntityId: string,
  payloadEntityId: string,
  payloadOwnerUserId: string,
): void {
  if (
    changeEntityId !== payloadEntityId ||
    payloadOwnerUserId !== ownerUserId
  ) {
    throw new Error("Received sync payload with mismatched identity.");
  }
}

function emitChanges(resources: Set<DataResource>): void {
  if (resources.size > 0) {
    emitDataChanged(...resources);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown sync error.";
}
