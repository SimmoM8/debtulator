import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";

import { emitDataChanged } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { SqliteSyncStore } from "@/src/data/sync/SqliteSyncStore";
import { requestSync } from "@/src/data/sync/syncSignal";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { SqliteMemberRepository } from "@/src/features/members/data/SqliteMemberRepository";
import type { Member } from "@/src/features/members/model/Member";
import { memberToCreateSyncPayload } from "@/src/features/members/utils/memberMapper";

type CreateMemberInput = {
  displayName: string;
};

export function useCreateMember() {
  const auth = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createMember = useCallback(
    async ({ displayName }: CreateMemberInput) => {
      if (!auth.session) {
        throw new Error("Cannot create a member while signed out.");
      }

      const normalizedName = displayName.trim();

      if (!normalizedName) {
        throw new Error("Member name is required.");
      }

      setIsCreating(true);

      try {
        const database = await openDatabase();
        const now = new Date().toISOString();

        const member: Member = {
          id: Crypto.randomUUID(),
          ownerUserId: auth.session.user.id,
          displayName: normalizedName,
          linkedUserId: null,
          createdAt: now,
          updatedAt: now,
          version: null,
        };

        await database.withExclusiveTransactionAsync(async (tx) => {
          const repository = new SqliteMemberRepository(tx);
          const syncStore = new SqliteSyncStore(tx);

          await repository.save(member);

          await syncStore.enqueue({
            id: Crypto.randomUUID(),
            ownerUserId: member.ownerUserId,
            entityType: "member",
            entityId: member.id,
            operation: "upsert",
            baseVersion: null,
            payload: memberToCreateSyncPayload(member),
            createdAt: now,
          });
        });

        emitDataChanged("members");
        requestSync();

        return member;
      } finally {
        setIsCreating(false);
      }
    },
    [auth.session],
  );

  return {
    createMember,
    isCreating,
  };
}
