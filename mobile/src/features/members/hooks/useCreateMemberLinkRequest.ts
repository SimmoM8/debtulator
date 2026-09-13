import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";

import { useBackendClient } from "@/src/data/backend/BackendProvider";
import type { Member } from "@/src/features/members/model/Member";
import { requestMemberLink } from "@/src/features/members/operations/requestMemberLink";

export function useCreateMemberLinkRequest() {
  const backend = useBackendClient();
  const [isCreating, setIsCreating] = useState(false);

  const createRequest = useCallback(
    async (input: {
      member: Member;
      targetUserId: string;
    }) => {
      if (!backend) {
        throw new Error("The backend is not available.");
      }

      if (input.member.linkedUserId !== null) {
        throw new Error("This member is already linked.");
      }

      setIsCreating(true);

      try {
        await requestMemberLink(backend, {
          requestId: Crypto.randomUUID(),
          targetUserId: input.targetUserId,
          memberId: input.member.id,
          displayName: null,
          useTargetName: false,
        });
      } finally {
        setIsCreating(false);
      }
    },
    [backend],
  );

  return {
    createRequest,
    isCreating,
  };
}
