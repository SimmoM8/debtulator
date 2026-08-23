import { SplitBackgroundScreen } from "@/src/components/layout/SplitBackgroundScreen";
import {
  DebtSummaryHeader,
  type DebtFilter,
} from "@/src/presentation/components/debts/DebtSummaryHeader";
import { DebtsList } from "@/src/presentation/components/debts/DebtsList";
import { buildDebtsScreenModel } from "@/src/presentation/dto/debtsScreenModel";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { colors } from "@/src/theme";

import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

export function DebtsScreen() {
  const data = useAppData();
  const [filter, setFilter] = useState<DebtFilter>("all");

  const model = useMemo(
    () =>
      buildDebtsScreenModel({
        ledgerEntries: data.ledgerEntries,
        members: data.members,
        personalTotals: data.personalTotals,
      }),
    [data.ledgerEntries, data.members, data.personalTotals],
  );

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return model.items;
    }

    if (filter === "due_soon") {
      return model.items.filter((item) => item.dueSoon);
    }

    return model.items.filter((item) => item.direction === filter);
  }, [filter, model.items]);

  return (
    <SplitBackgroundScreen
      hero={
        <DebtSummaryHeader
          youOwe={model.youOwe}
          theyOwe={model.theyOwe}
          youOweCount={model.youOweCount}
          theyOweCount={model.theyOweCount}
          netBalance={model.netBalance}
          filter={filter}
          onFilterChange={setFilter}
        />
      }
    >
      <View style={styles.content}>
        <DebtsList items={filteredItems} />
      </View>
    </SplitBackgroundScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.appBackground,
    minHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
});
