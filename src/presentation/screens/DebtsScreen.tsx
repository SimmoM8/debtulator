import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  DebtSummaryHeader,
  type DebtFilter,
} from "@/src/presentation/components/debts/DebtSummaryHeader";
import { DebtsList } from "@/src/presentation/components/debts/DebtsList";
import { SplitBackgroundScreen } from "@/src/presentation/components/layout";
import {
  ListState,
  type ListStateMessage,
} from "@/src/presentation/components/states/ListState";
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
        debts: data.debts.data,
        members: data.members.data,
      }),
    [data.debts.data, data.members.data],
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

  const showList =
    !data.debts.loading &&
    data.debts.error === null &&
    filteredItems.length > 0;

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
        {showList ? (
          <DebtsList items={filteredItems} />
        ) : (
          <ListState
            loading={data.debts.loading}
            error={data.debts.error}
            totalCount={model.items.length}
            visibleCount={filteredItems.length}
            loadingState={{
              title: "Loading debts…",
              message: "Your debts are being loaded.",
            }}
            emptyState={{
              title: "No debts yet",
              message: "Create your first debt to get started.",
            }}
            noResultsState={getDebtNoResultsState(filter)}
            errorState={{
              title: "Couldn’t load debts",
              message: "Your debts couldn’t be loaded. Try again.",
            }}
            onRetry={data.debts.refresh}
          />
        )}
      </View>
    </SplitBackgroundScreen>
  );
}

function getDebtNoResultsState(filter: DebtFilter): ListStateMessage {
  switch (filter) {
    case "you_owe":
      return {
        title: "Nothing you owe",
        message: "You don’t currently owe anyone.",
      };
    case "they_owe":
      return {
        title: "Nobody owes you",
        message: "Nobody currently owes you anything.",
      };
    case "due_soon":
      return {
        title: "Nothing due soon",
        message: "None of your debts are due within the next 7 days.",
      };
    case "all":
      return {
        title: "No debts",
        message: "There are no debts to show.",
      };
  }
}

const styles = StyleSheet.create({
  content: {
    minHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
});
