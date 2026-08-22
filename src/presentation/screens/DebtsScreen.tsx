import { SplitBackgroundScreen } from "@/src/components/layout/SplitBackgroundScreen";
import { DebtSummaryHeader } from "@/src/presentation/components/debts/DebtSummaryHeader";
import { DebtsList } from "@/src/presentation/components/debts/DebtsList";
import { buildDebtsScreenModel } from "@/src/presentation/dto/debtsScreenModel";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";

import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme";

export function DebtsScreen() {
  const data = useAppData();

  const model = useMemo(
    () =>
      buildDebtsScreenModel({
        ledgerEntries: data.ledgerEntries,
        members: data.members,
        personalTotals: data.personalTotals,
      }),
    [data.ledgerEntries, data.members, data.personalTotals],
  );

  return (
    <SplitBackgroundScreen
      hero={<DebtSummaryHeader youOwe={model.youOwe} theyOwe={model.theyOwe} />}
    >
      <View style={styles.content}>
        <DebtsList items={model.items} />
      </View>
    </SplitBackgroundScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.appBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
});
