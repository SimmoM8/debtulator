import { Stack } from "expo-router";

import { Platform } from "react-native";

import { useAppTheme } from "@/src/theme";

export function NavHeader() {
  const theme = useAppTheme();

  const isIos = Platform.OS === "ios";

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,

        headerTitleAlign: "center",

        headerTransparent: isIos,

        headerStyle: {
          backgroundColor: isIos
            ? theme.colors.transparent
            : theme.colors.mainBackground,
        },

        headerTintColor: isIos
          ? theme.colors.text
          : theme.colors.onHeroBackground,

        headerShadowVisible: false,
      }}
    />
  );
}
