import type { SQLiteDatabase } from "expo-sqlite";

import type { Profile } from "@/src/features/profile/model/Profile";

import type { ProfileSqlRow } from "./ProfileSqlRow";

export class SqliteProfileRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async get(userId: string): Promise<Profile | null> {
    const row = await this.db.getFirstAsync<ProfileSqlRow>(
      `
        SELECT user_id, base_currency_code
        FROM profiles
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId],
    );

    return row
      ? {
          userId: row.user_id,
          baseCurrencyCode: row.base_currency_code,
        }
      : null;
  }

  async save(profile: Profile): Promise<void> {
    await this.db.runAsync(
      `
        INSERT INTO profiles (user_id, base_currency_code)
        VALUES (?, ?)

        ON CONFLICT(user_id) DO UPDATE SET
          base_currency_code = excluded.base_currency_code
      `,
      [profile.userId, profile.baseCurrencyCode],
    );
  }
}
