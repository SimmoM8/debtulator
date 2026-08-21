import { colors } from "@/src/theme";
import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type ScreenProps = PropsWithChildren;

export function Screen({ children }: ScreenProps) {
  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.root}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
