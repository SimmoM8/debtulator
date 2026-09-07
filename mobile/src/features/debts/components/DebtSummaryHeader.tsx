import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { FilteringHero } from "@/src/components/hero";
import { textStyles, useAppTheme } from "@/src/theme";

export type DebtFilter = "all" | "you_owe" | "they_owe" | "due_soon";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "you_owe", label: "You owe" },
  { value: "they_owe", label: "They owe" },
  { value: "due_soon", label: "Due soon" },
] as const satisfies readonly {
  value: DebtFilter;
  label: string;
}[];

type DebtSummaryHeaderProps = {
  youOwe: number;
  theyOwe: number;
  youOweCount: number;
  theyOweCount: number;
  netBalance: number;
  filter: DebtFilter;
  onFilterChange: (filter: DebtFilter) => void;
};

export function DebtSummaryHeader({
  youOwe,
  theyOwe,
  youOweCount,
  theyOweCount,
  netBalance,
  filter,
  onFilterChange,
}: DebtSummaryHeaderProps) {
  const theme = useAppTheme();

  const netLabel = netBalance > 0 ? `+${netBalance} kr` : `${netBalance} kr`;

  return (
    <FilteringHero
      filter={filter}
      filterOptions={FILTERS}
      onFilterChange={onFilterChange}
    >
      <View style={styles.summary}>
        <View style={styles.balanceBlock}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            You owe
          </Text>

          <Text
            style={[
              styles.amount,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            {youOwe} kr
          </Text>

          <View style={styles.debtCount}>
            <SymbolView
              name={{
                ios: "arrow.up.right",
                android: "arrow_upward",
              }}
              tintColor={theme.colors.negative}
              size={14}
            />

            <Text
              style={[
                styles.countText,
                {
                  color: theme.colors.onHeroBackground,
                },
              ]}
            >
              {youOweCount} {youOweCount === 1 ? "debt" : "debts"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.onHeroBackground,
            },
          ]}
        />

        <View style={styles.balanceBlock}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            They owe
          </Text>

          <Text
            style={[
              styles.amount,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            {theyOwe} kr
          </Text>

          <View style={styles.debtCount}>
            <SymbolView
              name={{
                ios: "arrow.down.left",
                android: "arrow_downward",
              }}
              tintColor={theme.colors.positive}
              size={14}
            />

            <Text
              style={[
                styles.countText,
                {
                  color: theme.colors.onHeroBackground,
                },
              ]}
            >
              {theyOweCount} {theyOweCount === 1 ? "debt" : "debts"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.net}>
        <Text
          style={[
            styles.netLabel,
            {
              color: theme.colors.onHeroBackground,
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
          {netLabel}
        </Text>
      </View>
    </FilteringHero>
  );
}

const styles = StyleSheet.create({
  summary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
  },

  balanceBlock: {
    flex: 1,
    alignItems: "center",
  },

  divider: {
    width: 1,
    marginHorizontal: 20,
    opacity: 0.28,
  },

  label: {
    ...textStyles.caption,
    opacity: 0.82,
    textAlign: "center",
  },

  amount: {
    ...textStyles.title,
    marginTop: 4,
    textAlign: "center",
  },

  debtCount: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 5,
  },

  countText: {
    ...textStyles.caption,
    opacity: 0.82,
  },

  net: {
    alignItems: "center",
    marginTop: 18,
  },

  netLabel: {
    ...textStyles.caption,
    opacity: 0.72,
  },

  netAmount: {
    ...textStyles.body,
    marginTop: 2,
  },
});
