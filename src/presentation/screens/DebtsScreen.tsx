import { SplitBackgroundScreen } from "@/src/components/layout";
import { colors } from "@/src/theme";
import { StyleSheet, View } from "react-native";

import { DebtSummaryHeader } from "@/src/presentation/components/debts/DebtSummaryHeader";

export function DebtsScreen() {
  return (
    <SplitBackgroundScreen>
      <DebtSummaryHeader />
      <View style={styles.content}>{/* debt rows */}</View>
    </SplitBackgroundScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    minHeight: "100%",
    backgroundColor: colors.appBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});
