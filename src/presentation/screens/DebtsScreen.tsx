import { GradientScreen } from "@/src/components/layout/GradientScreen";
import { colors } from "@/src/theme";
import { StyleSheet, View } from "react-native";

import { DebtSummaryHeader } from "@/src/presentation/components/debts/DebtSummaryHeader";

export function DebtsScreen() {
  return (
    <GradientScreen>
      <DebtSummaryHeader />
      <View style={styles.content}>{/* debt rows */}</View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    minHeight: "50%",
    backgroundColor: colors.appBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});
