export const DEFAULT_CURRENCY_CODE = "SEK";

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  enabled: boolean;
  displayOrder: number;
};
