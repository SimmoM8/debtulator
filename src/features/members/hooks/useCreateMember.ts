import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";

import { openDatabase } from "@/src/database/openDatabase";
import { useAuth } from "@/src/features/auth/AuthProvider";

import { SqliteMemberRepository } from "../data/SqliteMemberRepository";

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

        const repository = new SqliteMemberRepository(database);

        const now = new Date().toISOString();

        const member = {
          id: Crypto.randomUUID(),
          ownerUserId: auth.session.user.id,
          displayName: normalizedName,
          createdAt: now,
          updatedAt: now,
        };

        await repository.save(member);

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
