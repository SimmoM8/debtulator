import { DebtSummaryHeader } from "@/src/presentation/components/debts/DebtSummaryHeader";
import { View } from "react-native";
import { Screen } from "@/src/components/layout";

export function DebtsScreen() {
  return (
    <Screen>
      <DebtSummaryHeader />

      <View>
        {/* filters */}
        {/* debt list */}
      </View>
    </Screen>
  );
}
