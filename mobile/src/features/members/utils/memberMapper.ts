import type { MemberSqlRow } from "@/src/features/members/data/MemberSqlRow";
import type { Member } from "@/src/features/members/model/Member";

export function mapMemberRow(row: MemberSqlRow): Member {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    displayName: row.display_name,
    linkedUserId: row.linked_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

export function memberToCreateSyncPayload(
  member: Member,
): Record<string, unknown> {
  return {
    displayName: member.displayName,
    createdAt: member.createdAt,
  };
}

export function syncPayloadToMember(
  value: Record<string, unknown>,
): Member {
  return {
    id: requireString(value.id, "id"),
    ownerUserId: requireString(value.ownerUserId, "ownerUserId"),
    displayName: requireString(value.displayName, "displayName"),
    linkedUserId:
      value.linkedUserId === null
        ? null
        : requireString(value.linkedUserId, "linkedUserId"),
    createdAt: requireString(value.createdAt, "createdAt"),
    updatedAt: requireString(value.updatedAt, "updatedAt"),
    version: requireVersion(value.version),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid member sync field '${field}'.`);
  }

  return value;
}

function requireVersion(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error("Invalid member sync version.");
  }

  return value;
}
