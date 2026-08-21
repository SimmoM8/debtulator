import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme";

export function AppBackground({ children }: PropsWithChildren) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
