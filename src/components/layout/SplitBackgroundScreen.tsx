import { colors, gradients } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type ScreenProps = PropsWithChildren;

export function SplitBackgroundScreen({ children }: ScreenProps) {
  return (
    <View style={styles.root}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <LinearGradient
          colors={gradients.background}
          locations={[0.5, 0.5]}
          style={styles.background}
        >
          {children}
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  background: {
    flex: 1,
    /*
     * Oversized vertically so iOS rubber-band scrolling never exposes
     * the underlying app background. The upper half backs the transparent
     * native header; the lower half backs the transparent native tab bar.
     */
    minHeight: "200%",
    marginTop: "-100%",
    paddingTop: "100%",
  },
});
