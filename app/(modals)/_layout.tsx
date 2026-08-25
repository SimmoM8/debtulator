import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTitleAlign: "center",

        headerStyle: {
          backgroundColor: colors.mainBackground,
        },

        headerTintColor: colors.onDarkBackground,
        headerShadowVisible: false,

        contentStyle: {
          backgroundColor: colors.mainBackground,
        },
      }}
    />
  );
}
