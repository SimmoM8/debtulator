import type { CurrencyCode } from '@/src/types/models';

export type SupportedCountryCode = 'SE' | 'AU' | 'EU' | 'US' | 'GB';

export const SUPPORTED_COUNTRIES: {
  label: string;
  value: SupportedCountryCode;
  currency: CurrencyCode;
}[] = [
  { label: 'Sweden', value: 'SE', currency: 'SEK' },
  { label: 'Australia', value: 'AU', currency: 'AUD' },
  { label: 'Euro area', value: 'EU', currency: 'EUR' },
  { label: 'United States', value: 'US', currency: 'USD' },
  { label: 'United Kingdom', value: 'GB', currency: 'GBP' },
];

export function currencyForCountry(country: string): CurrencyCode {
  return SUPPORTED_COUNTRIES.find((option) => option.value === country)?.currency ?? 'EUR';
}
