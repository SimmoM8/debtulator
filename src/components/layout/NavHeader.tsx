import { colors } from "@/src/theme/colors";
import { Stack } from "expo-router";

export function NavHeader() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.onBackground,
        headerShadowVisible: false,
      }}
    />
  );
}
