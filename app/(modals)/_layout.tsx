import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.appBackground,
        },
        headerTintColor: colors.native.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.appBackground,
        },
      }}
    >
      <Stack.Screen name="debt" />
    </Stack>
  );
}
