import { StyleSheet, Text, View } from "react-native";

import { textStyles } from "@/src/theme";

export function DebtSummaryHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Overview of your balances</Text>

      <View style={styles.summary}>
        <View>
          <Text style={styles.label}>You owe</Text>

          <Text style={styles.amount}>58 kr</Text>
        </View>

        <View>
          <Text style={styles.label}>They owe</Text>

          <Text style={styles.amount}>28 kr</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  subtitle: {
    ...textStyles.body,
    color: "#FFFFFF",
  },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },

  label: {
    color: "#FFFFFF",
  },

  amount: {
    ...textStyles.largeTitle,
    color: "#FFFFFF",
  },
});
