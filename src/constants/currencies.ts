import type { CurrencyCode } from '@/src/types/models';

export const CURRENCIES: CurrencyCode[] = ['SEK', 'AUD', 'EUR', 'USD', 'GBP'];

export const DEFAULT_BASE_CURRENCY: CurrencyCode = 'SEK';

export const DEFAULT_CURRENCY_RATES_TO_SEK: Record<CurrencyCode, number> = {
  SEK: 1,
  AUD: 6.85,
  EUR: 11.25,
  USD: 10.45,
  GBP: 13.05,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  SEK: 'kr',
  AUD: 'A$',
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export const CURRENCY_SYMBOL_PLACEMENT: Record<CurrencyCode, 'prefix' | 'suffix'> = {
  SEK: 'suffix',
  AUD: 'prefix',
  EUR: 'prefix',
  USD: 'prefix',
  GBP: 'prefix',
};
