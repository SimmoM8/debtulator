import type { PropsWithChildren } from "react";

import { ScrollView, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/theme";

type ScreenProps = PropsWithChildren;

export function SolidScreen({ children }: ScreenProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.root,

        {
          backgroundColor: theme.colors.mainBackground,
        },
      ]}
    >
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
