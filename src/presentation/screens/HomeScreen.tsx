import { StyleSheet, Text } from "react-native";

import { Screen } from "@/src/components/layout";
import { colors } from "@/src/theme";

export function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Home</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
    padding: 24,
  },
});
