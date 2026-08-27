export const CURRENCY_CODES = ["AUD", "EUR", "GBP", "SEK", "USD"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type Currency = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimalPlaces: number;
};
