import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  DebtSummaryHeader,
  type DebtFilter,
} from "@/src/presentation/components/debts/DebtSummaryHeader";
import { DebtsList } from "@/src/presentation/components/debts/DebtsList";
import { SplitBackgroundScreen } from "@/src/presentation/components/layout";
import { buildDebtsScreenModel } from "@/src/presentation/dto/debtsScreenDto";
import { useCoreData } from "@/src/presentation/providers/CoreDataProvider";
import { useAppTheme } from "@/src/theme";

export function DebtsScreen() {
  const data = useCoreData();
  const theme = useAppTheme();
  const [filter, setFilter] = useState<DebtFilter>("all");

  const model = useMemo(
    () =>
      buildDebtsScreenModel({
        debts: data.debts,
        members: data.members,
      }),
    [data.debts, data.members],
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
      <View
        style={[
          styles.content,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        <DebtsList items={filteredItems} />
      </View>
    </SplitBackgroundScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    minHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
});
