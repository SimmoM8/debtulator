import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, spacing, typefaces } from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import type {
    AppSettings,
    CurrencyCode,
    CurrencyRate,
    MoneyMap,
} from "@/src/types/models";
import { formatMoney, formatMoneyMap } from "@/src/utils/money";

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
  const entries = Object.entries(balances).filter(
    ([, amount]) => Math.abs(amount ?? 0) > 0.005,
  );
  const estimated = estimateMoneyMap(balances, settings, currencyRates);

  return (
    <View style={[styles.stack, align === "right" && styles.stackRight]}>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        entries.map(([currency, amount]) => (
          <Amount
            key={currency}
            amount={amount ?? 0}
            currency={currency as CurrencyCode}
            signed
          />
        ))
      )}
      {settings.showEstimatedBase && entries.length > 0 ? (
        <Text style={styles.estimate}>
          Approx.{" "}
          {formatMoney(estimated, settings.baseCurrency, { signed: true })}
        </Text>
      ) : null}
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
    fontSize: 15,
  },
  md: {
    fontSize: 20,
  },
  lg: {
    fontSize: 30,
  },
  estimate: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  empty: {
    color: palette.faint,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  moneyLine: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.1,
  },
});
