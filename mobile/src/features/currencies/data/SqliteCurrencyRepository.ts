import type { SQLiteDatabase } from "expo-sqlite";

import type { Currency } from "@/src/features/currencies/model/Currency";

import type { CurrencyRepository } from "./CurrencyRepository";
import type { CurrencySqlRow } from "./CurrencySqlRow";

export class SqliteCurrencyRepository implements CurrencyRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getAll(): Promise<Currency[]> {
    const rows = await this.db.getAllAsync<CurrencySqlRow>(`
      SELECT code, name, symbol, decimal_places, enabled, display_order
      FROM currencies
      ORDER BY display_order ASC, code ASC
    `);

    return rows.map(mapCurrencyRow);
  }

  async getByCode(code: string): Promise<Currency | null> {
    const row = await this.db.getFirstAsync<CurrencySqlRow>(
      `
        SELECT code, name, symbol, decimal_places, enabled, display_order
        FROM currencies
        WHERE code = ?
        LIMIT 1
      `,
      [code],
    );

    return row ? mapCurrencyRow(row) : null;
  }

  async replaceCatalogue(currencies: readonly Currency[]): Promise<void> {
    if (currencies.length === 0) {
      throw new Error(
        "Cannot replace the local currency catalogue with an empty snapshot.",
      );
    }

    for (const currency of currencies) {
      await this.db.runAsync(
        `
          INSERT INTO currencies (
            code,
            name,
            symbol,
            decimal_places,
            enabled,
            display_order
          )
          VALUES (?, ?, ?, ?, ?, ?)

          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            symbol = excluded.symbol,
            decimal_places = excluded.decimal_places,
            enabled = excluded.enabled,
            display_order = excluded.display_order
        `,
        [
          currency.code,
          currency.name,
          currency.symbol,
          currency.decimalPlaces,
          currency.enabled ? 1 : 0,
          currency.displayOrder,
        ],
      );
    }

    const placeholders = currencies.map(() => "?").join(", ");

    await this.db.runAsync(
      `DELETE FROM currencies WHERE code NOT IN (${placeholders})`,
      currencies.map((currency) => currency.code),
    );
  }
}

function mapCurrencyRow(row: CurrencySqlRow): Currency {
  return {
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalPlaces: row.decimal_places,
    enabled: row.enabled === 1,
    displayOrder: row.display_order,
  };
}
