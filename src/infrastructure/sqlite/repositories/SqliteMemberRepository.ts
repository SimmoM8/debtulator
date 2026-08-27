import type { Member } from "@/src/domain/members/Member";
import type { MemberRepository } from "@/src/domain/members/MemberRepository";

import type { DebtulatorDatabase } from "../database/types";
import { mapMemberRow } from "../mappers/memberMapper";
import type { MemberRow } from "../rows/MemberRow";

export class SqliteMemberRepository implements MemberRepository {
  constructor(private readonly db: DebtulatorDatabase) {}

  async getAllByOwner(ownerUserId: string): Promise<Member[]> {
    const rows = await this.db.getAllAsync<MemberRow>(
      `
        SELECT id, owner_user_id, display_name, created_at, updated_at
        FROM members
        WHERE owner_user_id = ?
        ORDER BY display_name COLLATE NOCASE ASC
      `,
      [ownerUserId],
    );

    return rows.map(mapMemberRow);
  }

  async getById(
    ownerUserId: string,
    memberId: string,
  ): Promise<Member | null> {
    const row = await this.db.getFirstAsync<MemberRow>(
      `
        SELECT id, owner_user_id, display_name, created_at, updated_at
        FROM members
        WHERE owner_user_id = ?
          AND id = ?
        LIMIT 1
      `,
      [ownerUserId, memberId],
    );

    return row ? mapMemberRow(row) : null;
  }

  async save(member: Member): Promise<void> {
    await this.db.runAsync(
      `
        INSERT INTO members (
          id, owner_user_id, display_name, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          owner_user_id = excluded.owner_user_id,
          display_name = excluded.display_name,
          updated_at = excluded.updated_at
      `,
      [
        member.id,
        member.ownerUserId,
        member.displayName,
        member.createdAt,
        member.updatedAt,
      ],
    );
  }

  async delete(ownerUserId: string, memberId: string): Promise<void> {
    await this.db.runAsync(
      `
        DELETE FROM members
        WHERE owner_user_id = ?
          AND id = ?
      `,
      [ownerUserId, memberId],
    );
  }
}
