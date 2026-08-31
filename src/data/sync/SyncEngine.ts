import type { SQLiteDatabase } from "expo-sqlite";

import { SqliteDebtRepository } from "@/src/features/debts/data/SqliteDebtRepository";
import { SqliteMemberRepository } from "@/src/features/members/data/SqliteMemberRepository";

import { DataResource, emitDataChanged } from "@/src/data/sqlite/dataChanges";
import { SqliteSyncStore } from "@/src/data/sync/SqliteSyncStore";
import { SupabaseSyncGateway } from "@/src/data/sync/SupabaseSyncGateway";
import {
  remoteDebtToDomain,
  remoteMemberToDomain,
} from "@/src/data/sync/syncMappers";
import type { RemoteSyncChange } from "@/src/data/sync/syncTypes";

export class SyncEngine {
  private runningPromise: Promise<void> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly remote: SupabaseSyncGateway,
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
    await this.pull(ownerUserId);
  }

  private async push(ownerUserId: string): Promise<void> {
    const syncRepository = new SqliteSyncStore(this.db);

    const mutations = await syncRepository.getPending(ownerUserId);

    for (const mutation of mutations) {
      try {
        await this.remote.pushMutation(mutation);

        await syncRepository.markCompleted(mutation.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sync error.";

        await syncRepository.markFailed(mutation.id, message);

        /*
         * Do not pull newer remote data while this device still has an
         * unpushed local mutation.
         *
         * That keeps mutation ordering deterministic.
         */
        throw error;
      }
    }
  }

  private async pull(ownerUserId: string): Promise<void> {
    const syncStore = new SqliteSyncStore(this.db);

    while (true) {
      const lastSequence = await syncStore.getLastRemoteSequence(ownerUserId);

      const changes = await this.remote.getChangesAfter(
        ownerUserId,
        lastSequence,
      );

      if (changes.length === 0) {
        return;
      }

      await this.applyChangeBatch(ownerUserId, changes);
    }
  }

  private async applyChangeBatch(
    ownerUserId: string,
    changes: RemoteSyncChange[],
  ): Promise<void> {
    const changedResources = new Set<DataResource>();

    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const memberRepository = new SqliteMemberRepository(tx);
      const debtRepository = new SqliteDebtRepository(tx);
      const syncRepository = new SqliteSyncStore(tx);

      for (const change of changes) {
        if (change.owner_user_id !== ownerUserId) {
          throw new Error("Received sync change for another owner.");
        }

        if (change.entity_type === "member") {
          if (change.operation === "delete") {
            await memberRepository.delete(ownerUserId, change.entity_id);
          } else {
            if (!change.payload) {
              throw new Error("Missing member sync payload.");
            }

            await memberRepository.save(remoteMemberToDomain(change.payload));
          }

          changedResources.add("members");
        }

        if (change.entity_type === "debt") {
          if (change.operation === "delete") {
            await debtRepository.delete(ownerUserId, change.entity_id);
          } else {
            if (!change.payload) {
              throw new Error("Missing debt sync payload.");
            }

            await debtRepository.save(remoteDebtToDomain(change.payload));
          }

          changedResources.add("debts");
        }

        await syncRepository.setLastRemoteSequence(
          ownerUserId,
          change.sequence,
        );
      }
    });

    if (changedResources.size > 0) {
      emitDataChanged(...changedResources);
    }
  }
}
