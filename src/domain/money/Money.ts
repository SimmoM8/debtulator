import type { CurrencyCode } from "@/src/domain/currencies/Currency";

export type MoneyMap = Partial<Record<CurrencyCode, number>>;
