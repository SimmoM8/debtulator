import type { Currency } from "../model/Currency";

export interface CurrencyRepository {
  getAll(): Promise<Currency[]>;
  getByCode(code: string): Promise<Currency | null>;
  replaceCatalogue(currencies: readonly Currency[]): Promise<void>;
}
