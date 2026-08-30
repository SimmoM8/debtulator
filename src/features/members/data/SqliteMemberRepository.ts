import type { SQLiteDatabase } from "expo-sqlite";

import type { Member } from "../model/Member";
import type { MemberRepository } from "./MemberRepository";
import type { MemberSqlRow } from "./MemberSqlRow";

export class SqliteMemberRepository implements MemberRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getAllByOwner(ownerUserId: string): Promise<Member[]> {
    const rows = await this.db.getAllAsync<MemberSqlRow>(
      `
        SELECT
          id,
          owner_user_id,
          display_name,
          created_at,
          updated_at
        FROM members
        WHERE owner_user_id = ?
        ORDER BY display_name COLLATE NOCASE ASC
      `,
      [ownerUserId],
    );

    return rows.map(mapMemberRow);
  }

  async getById(ownerUserId: string, memberId: string): Promise<Member | null> {
    const row = await this.db.getFirstAsync<MemberSqlRow>(
      `
        SELECT
          id,
          owner_user_id,
          display_name,
          created_at,
          updated_at
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
    const result = await this.db.runAsync(
      `
        INSERT INTO members (
          id,
          owner_user_id,
          display_name,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(id) DO UPDATE SET
          display_name = excluded.display_name,
          updated_at = excluded.updated_at

        WHERE members.owner_user_id = excluded.owner_user_id
      `,
      [
        member.id,
        member.ownerUserId,
        member.displayName,
        member.createdAt,
        member.updatedAt,
      ],
    );

    if (result.changes === 0) {
      const existing = await this.db.getFirstAsync<{
        owner_user_id: string;
      }>(
        `
          SELECT owner_user_id
          FROM members
          WHERE id = ?
          LIMIT 1
        `,
        [member.id],
      );

      if (existing && existing.owner_user_id !== member.ownerUserId) {
        throw new Error("Cannot change the owner of an existing member.");
      }
    }
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

function mapMemberRow(row: MemberSqlRow): Member {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
