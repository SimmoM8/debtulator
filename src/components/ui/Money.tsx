import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, spacing, typefaces,

typography,
} from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import type {
    AppSettings,
    CurrencyCode,
    CurrencyRate,
    MoneyMap,
} from "@/src/types/models";
import { formatMoney, formatMoneyMap } from "@/src/utils/money";

const MINIMUM_BALANCE_THRESHOLD = 0.005;

export function Amount({
  amount,
  currency,
  signed,
  size = "md",
}: {
  amount: number;
  currency: CurrencyCode;
  signed?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const tone =
    amount > 0 ? palette.positive : amount < 0 ? palette.coral : palette.muted;
  return (
    <Text style={[styles.amount, styles[size], { color: tone }]}>
      {formatMoney(amount, currency, { signed })}
    </Text>
  );
}

export function BalanceStack({
  balances,
  settings,
  currencyRates,
  align = "left",
  empty = "No balance",
}: {
  balances: MoneyMap;
  settings: AppSettings;
  currencyRates: CurrencyRate[];
  align?: "left" | "right";
  empty?: string;
}) {
  const estimated = estimateMoneyMap(balances, settings, currencyRates);
  const hasBalance = Math.abs(estimated) > MINIMUM_BALANCE_THRESHOLD;

  return (
    <View style={[styles.stack, align === "right" && styles.stackRight]}>
      {!hasBalance ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        <Amount amount={estimated} currency={settings.baseCurrency} signed />
      )}
    </View>
  );
}

export function MoneyLine({ balances }: { balances: MoneyMap }) {
  return <Text style={styles.moneyLine}>{formatMoneyMap(balances)}</Text>;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xs,
  },
  stackRight: {
    alignItems: "flex-end",
  },
  amount: {
    fontFamily: typefaces.bodyHeavy,
    letterSpacing: 0,
    fontVariant: ["tabular-nums"],
  },
  sm: {
    fontSize: typography.size.lg,
  },
  md: {
    fontSize: typography.size.h3,
  },
  lg: {
    fontSize: typography.size.displayMd,
  },
  empty: {
    color: palette.faint,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  moneyLine: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.1,
  },
});
