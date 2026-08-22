import { StyleSheet, Text, View } from "react-native";

import { colors, textStyles } from "@/src/theme";

export function DebtSummaryHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Overview of your balances</Text>

      <View style={styles.summary}>
        <View style={styles.balanceBlock}>
          <Text style={styles.label}>You owe</Text>

          <Text style={styles.amount}>58 kr</Text>
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.label}>They owe</Text>

          <Text style={styles.amount}>28 kr</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: colors.transparent,
    top: 10,
  },

  subtitle: {
    ...textStyles.caption,
    color: colors.onDarkBackground,
    opacity: 0.82,
  },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
});
