import * as Crypto from "expo-crypto";

import { emitDataChanged } from "@/src/data/sqlite/dataChanges";
import { openDatabase } from "@/src/data/sqlite/openDatabase";
import { SqliteSyncStore } from "@/src/data/sync/SqliteSyncStore";
import { requestSync } from "@/src/data/sync/syncSignal";
import { SqliteMemberRepository } from "@/src/features/members/data/SqliteMemberRepository";
import type { Member } from "@/src/features/members/model/Member";
import { memberToCreateSyncPayload } from "@/src/features/members/utils/memberMapper";

export async function renameMember(
  member: Member,
  displayName: string,
): Promise<Member> {
  const normalizedName = displayName.trim();

  if (!normalizedName) {
    throw new Error("Member name is required.");
  }

  if (normalizedName === member.displayName) {
    return member;
  }

  const database = await openDatabase();
  const now = new Date().toISOString();
  const updatedMember: Member = {
    ...member,
    displayName: normalizedName,
    updatedAt: now,
  };

  await database.withExclusiveTransactionAsync(async (tx) => {
    await new SqliteMemberRepository(tx).save(updatedMember);

    await new SqliteSyncStore(tx).enqueue({
      id: Crypto.randomUUID(),
      ownerUserId: member.ownerUserId,
      entityType: "member",
      entityId: member.id,
      operation: "upsert",
      baseVersion: member.version,
      payload: memberToCreateSyncPayload(updatedMember),
      createdAt: now,
    });
  });

  emitDataChanged("members");
  requestSync();

  return updatedMember;
}
