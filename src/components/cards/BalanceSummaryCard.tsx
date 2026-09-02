import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, textStyles, useAppTheme } from "@/src/theme";

import { Card } from "./Card";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type BalanceSummaryCardProps = {
  youOwe: number;
  theyOwe: number;

  youOweCount: number;
  theyOweCount: number;

  netBalance: number;

  currency?: string;
};

export function BalanceSummaryCard({
  youOwe,
  theyOwe,
  youOweCount,
  theyOweCount,
  netBalance,
  currency = "kr",
}: BalanceSummaryCardProps) {
  const theme = useAppTheme();

  return (
    <Card variant="onBrand">
      <View style={styles.balances}>
        <BalanceColumn
          label="You owe"
          amount={youOwe}
          count={youOweCount}
          currency={currency}
          icon={{
            ios: "arrow.up.right",
            android: "arrow_upward",
          }}
          iconColor={theme.colors.negative}
        />

        <View
          style={[
            styles.verticalDivider,
            {
              backgroundColor: theme.colors.onBrandSurfaceBorder,
            },
          ]}
        />

        <BalanceColumn
          label="They owe"
          amount={theyOwe}
          count={theyOweCount}
          currency={currency}
          icon={{
            ios: "arrow.down.left",
            android: "arrow_downward",
          }}
          iconColor={theme.colors.positive}
        />
      </View>

      <View
        style={[
          styles.horizontalDivider,
          {
            backgroundColor: theme.colors.onBrandSurfaceBorder,
          },
        ]}
      />

      <View style={styles.net}>
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.onBrandMuted,
            },
          ]}
        >
          Net balance
        </Text>

        <Text
          style={[
            styles.netAmount,
            {
              color: theme.colors.onHeroBackground,
            },
          ]}
        >
          {formatNetBalance(netBalance, currency)}
        </Text>
      </View>
    </Card>
  );
}

type BalanceColumnProps = {
  label: string;
  amount: number;
  count: number;
  currency: string;
  icon: SymbolName;
  iconColor: string;
};

function BalanceColumn({
  label,
  amount,
  count,
  currency,
  icon,
  iconColor,
}: BalanceColumnProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.balance}>
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.onBrandMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.amount,
          {
            color: theme.colors.onHeroBackground,
          },
        ]}
      >
        {formatAmount(amount, currency)}
      </Text>

      <View style={styles.countRow}>
        <SymbolView
          name={icon}
          tintColor={iconColor}
          size={textStyles.caption.fontSize}
        />

        <Text
          style={[
            styles.count,
            {
              color: theme.colors.onBrandMuted,
            },
          ]}
        >
          {count} {count === 1 ? "debt" : "debts"}
        </Text>
      </View>
    </View>
  );
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}

function formatNetBalance(amount: number, currency: string): string {
  const prefix = amount > 0 ? "+" : "";

  return `${prefix}${amount.toLocaleString()} ${currency}`;
}

const styles = StyleSheet.create({
  balances: {
    flexDirection: "row",
    paddingVertical: spacing.lg,
  },

  balance: {
    flex: 1,
    alignItems: "center",
  },

  verticalDivider: {
    width: StyleSheet.hairlineWidth,
  },

  label: {
    ...textStyles.caption,
  },

  amount: {
    ...textStyles.headline,
    marginTop: spacing.xs,
  },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  count: {
    ...textStyles.caption,
  },

  horizontalDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },

  net: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },

  netAmount: {
    ...textStyles.headline,
    marginTop: spacing.xs,
  },
});
