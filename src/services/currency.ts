import type { AppSettings, CurrencyCode, CurrencyRate, MoneyMap } from '@/src/types/models';
import { addMoney, roundMoney } from '@/src/utils/money';

export function rateMap(currencyRates: CurrencyRate[]) {
  return Object.fromEntries(currencyRates.map((rate) => [rate.currency, rate.rateToSek])) as Record<
    CurrencyCode,
    number
  >;
}

export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  currencyRates: CurrencyRate[],
) {
  if (fromCurrency === toCurrency) {
    return roundMoney(amount);
  }

  const rates = rateMap(currencyRates);
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) {
    return 0;
  }

  return roundMoney((amount * fromRate) / toRate);
}

export function estimateMoneyMap(map: MoneyMap, settings: AppSettings, currencyRates: CurrencyRate[]) {
  return Object.entries(map).reduce((sum, [currency, amount]) => {
    return sum + convertCurrency(amount ?? 0, currency as CurrencyCode, settings.baseCurrency, currencyRates);
  }, 0);
}

export function addEstimatedTotal(
  target: MoneyMap,
  source: MoneyMap,
  baseCurrency: CurrencyCode,
  currencyRates: CurrencyRate[],
) {
  for (const [currency, value] of Object.entries(source)) {
    addMoney(target, baseCurrency, convertCurrency(value ?? 0, currency as CurrencyCode, baseCurrency, currencyRates));
  }
}
