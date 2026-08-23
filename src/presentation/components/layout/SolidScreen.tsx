import { colors } from "@/src/theme";
import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type ScreenProps = PropsWithChildren;

export function SolidScreen({ children }: ScreenProps) {
  return (
    <View style={styles.root}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mainBackground,
  },
});
