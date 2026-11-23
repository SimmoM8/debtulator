import type { SQLiteDatabase } from "expo-sqlite";

import type { LinkedAccountSummary } from "@/src/features/members/model/LinkedAccountSummary";

export class SqliteLinkedAccountSummaryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getUsername(
    ownerUserId: string,
    linkedUserId: string,
  ): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ username: string }>(
      `
        SELECT username
        FROM linked_account_summaries
        WHERE owner_user_id = ? AND linked_user_id = ?
        LIMIT 1
      `,
      [ownerUserId, linkedUserId],
    );

    return row?.username ?? null;
  }

  /** Must be called inside the caller's exclusive SQLite transaction. */
  async replaceForOwner(
    ownerUserId: string,
    summaries: LinkedAccountSummary[],
  ): Promise<void> {
    await this.db.runAsync(
      "DELETE FROM linked_account_summaries WHERE owner_user_id = ?",
      [ownerUserId],
    );

    for (const summary of summaries) {
      await this.db.runAsync(
        `
          INSERT INTO linked_account_summaries (
            owner_user_id, linked_user_id, username
          ) VALUES (?, ?, ?)
        `,
        [ownerUserId, summary.linkedUserId, summary.username],
      );
    }
  }
}
