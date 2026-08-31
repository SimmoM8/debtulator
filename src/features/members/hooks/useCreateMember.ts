import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";

import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";

import { emitDataChanged } from "@/src/data/sqlite/dataChanges";
import { SqliteSyncStore } from "@/src/data/sync/SqliteSyncStore";
import { requestSync } from "@/src/data/sync/syncSignal";
import { SqliteMemberRepository } from "@/src/features/members/data/SqliteMemberRepository";

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

        const member = {
          id: Crypto.randomUUID(),
          ownerUserId: auth.session.user.id,
          displayName: normalizedName,
          createdAt: now,
          updatedAt: now,
        };

        await database.withExclusiveTransactionAsync(async (tx) => {
          const repository = new SqliteMemberRepository(tx);

          const syncRepository = new SqliteSyncStore(tx);

          await repository.save(member);

          await syncRepository.enqueue({
            id: Crypto.randomUUID(),
            ownerUserId: member.ownerUserId,
            entityType: "member",
            entityId: member.id,
            operation: "upsert",
            payload: {
              id: member.id,
              owner_user_id: member.ownerUserId,
              display_name: member.displayName,
              created_at: member.createdAt,
              updated_at: member.updatedAt,
            },
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
