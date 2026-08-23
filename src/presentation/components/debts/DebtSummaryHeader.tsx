import type { MoneyMap } from "@/src/domain/models";
import { SegmentedControl } from "@/src/presentation/components/segmented_controls";
import { colors, textStyles } from "@/src/theme";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

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
  youOwe: MoneyMap;
  theyOwe: MoneyMap;
  youOweCount: number;
  theyOweCount: number;
  netBalance: MoneyMap;
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
  const netAmount = netBalance.SEK ?? 0;
  const netLabel = netAmount > 0 ? `+${netAmount} kr` : `${netAmount} kr`;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.balanceBlock}>
          <Text style={styles.label}>You owe</Text>

          <Text style={styles.amount}>{youOwe.SEK ?? 0} kr</Text>

          <View style={styles.debtCount}>
            <SymbolView
              name={{
                ios: "arrow.up.right",
                android: "arrow_upward",
              }}
              tintColor={colors.brand.negative}
              size={14}
            />

            <Text style={styles.countText}>
              {youOweCount} {youOweCount === 1 ? "debt" : "debts"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.balanceBlock}>
          <Text style={styles.label}>They owe</Text>

          <Text style={styles.amount}>{theyOwe.SEK ?? 0} kr</Text>

          <View style={styles.debtCount}>
            <SymbolView
              name={{
                ios: "arrow.down.left",
                android: "arrow_downward",
              }}
              tintColor={colors.brand.positive}
              size={14}
            />

            <Text style={styles.countText}>
              {theyOweCount} {theyOweCount === 1 ? "debt" : "debts"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.net}>
        <Text style={styles.netLabel}>Net balance</Text>
        <Text style={styles.netAmount}>{netLabel}</Text>
      </View>

      <View style={styles.filter}>
        <SegmentedControl
          value={filter}
          options={FILTERS}
          onChange={onFilterChange}
          accessibilityLabel="Debt filter"
          colorScheme="dark"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

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
    backgroundColor: colors.onDarkBackground,
    opacity: 0.28,
  },

  label: {
    ...textStyles.caption,
    color: colors.onDarkBackground,
    opacity: 0.82,
    textAlign: "center",
  },

  amount: {
    ...textStyles.title,
    color: colors.onDarkBackground,
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
    color: colors.onDarkBackground,
    opacity: 0.82,
  },

  net: {
    alignItems: "center",
    marginTop: 18,
  },

  netLabel: {
    ...textStyles.caption,
    color: colors.onDarkBackground,
    opacity: 0.72,
  },

  netAmount: {
    ...textStyles.body,
    color: colors.onDarkBackground,
    marginTop: 2,
  },

  filter: {
    marginTop: 20,
    width: "100%",
  },
});
