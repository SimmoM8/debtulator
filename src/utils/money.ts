import { CURRENCY_SYMBOL_PLACEMENT, CURRENCY_SYMBOLS } from '@/src/constants/currencies';
import type { CurrencyCode, MoneyMap } from '@/src/types/models';

export function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: CurrencyCode, options?: { signed?: boolean }) {
  const absolute = Math.abs(roundMoney(amount));
  const value = absolute.toLocaleString(undefined, {
    minimumFractionDigits: absolute % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted =
    CURRENCY_SYMBOL_PLACEMENT[currency] === 'suffix'
      ? `${value} ${symbol}`
      : `${symbol}${value}`;

  if (!options?.signed || amount === 0) {
    return formatted;
  }

  return `${amount > 0 ? '+' : '-'}${formatted}`;
}

export function formatMoneyMap(map: MoneyMap, empty = 'No balance') {
  const entries = Object.entries(map).filter(([, value]) => Math.abs(value ?? 0) > 0.005);
  if (entries.length === 0) {
    return empty;
  }

  return entries
    .map(([currency, value]) => formatMoney(value ?? 0, currency as CurrencyCode, { signed: true }))
    .join('  ');
}

export function addMoney(target: MoneyMap, currency: CurrencyCode, amount: number) {
  target[currency] = roundMoney((target[currency] ?? 0) + amount);
  if (Math.abs(target[currency] ?? 0) < 0.005) {
    delete target[currency];
  }
}

export function sumMoneyMap(map: MoneyMap) {
  return Object.values(map).reduce((sum, value) => sum + Math.abs(value ?? 0), 0);
}
