import type { Member } from "@/src/domain/members/Member";

import type { MemberRow } from "../rows/MemberRow";

export function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
