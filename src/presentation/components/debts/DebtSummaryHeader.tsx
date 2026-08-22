import type { MoneyMap } from "@/src/domain/models";
import { SegmentedControl } from "@/src/presentation/components/segmented_controls";
import { colors, textStyles } from "@/src/theme";
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
  filter: DebtFilter;
  onFilterChange: (filter: DebtFilter) => void;
};

export function DebtSummaryHeader({
  youOwe,
  theyOwe,
  filter,
  onFilterChange,
}: DebtSummaryHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Overview of your balances</Text>

      <View style={styles.summary}>
        <View style={styles.balanceBlock}>
          <Text style={styles.label}>You owe</Text>
          <Text style={styles.amount}>{youOwe.SEK ?? 0} kr</Text>
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.label}>They owe</Text>
          <Text style={styles.amount}>{theyOwe.SEK ?? 0} kr</Text>
        </View>
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
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  subtitle: {
    ...textStyles.caption,
    color: colors.onDarkBackground,
    opacity: 0.82,
  },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  balanceBlock: {
    flex: 1,
  },

  label: {
    ...textStyles.caption,
    color: colors.onDarkBackground,
    opacity: 0.82,
  },

  amount: {
    ...textStyles.title,
    color: colors.onDarkBackground,
    marginTop: 4,
  },

  filter: {
    marginTop: 20,
    width: "100%",
  },

  filterHost: {
    width: "100%",
    height: 36,
  },
});
