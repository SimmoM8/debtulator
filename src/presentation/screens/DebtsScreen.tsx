import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";

import {
  DebtSummaryHeader,
  type DebtFilter,
} from "@/src/presentation/components/debts/DebtSummaryHeader";
import { DebtsList } from "@/src/presentation/components/debts/DebtsList";
import { SplitBackgroundScreen } from "@/src/presentation/components/layout";
import { buildDebtsScreenModel } from "@/src/presentation/dto/debtsScreenModel";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { colors } from "@/src/theme";

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
    <>
      <Stack.Screen
        options={{
          title: "Debts",
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.magnifyingglass}
          accessibilityLabel="Search debts"
          onPress={() => {
            // Search debts
          }}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.plus}
          accessibilityLabel="Add debt"
          onPress={() => {
            router.push("/(modals)/debt/select-member");
          }}
        />

        <Stack.Toolbar.Menu icon={toolbarIcons.ellipsis}>
          <Stack.Toolbar.MenuAction
            onPress={() => {
              // Filter debts
            }}
          >
            Filter
          </Stack.Toolbar.MenuAction>

          <Stack.Toolbar.MenuAction
            onPress={() => {
              // Sort debts
            }}
          >
            Sort
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

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
    </>
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
