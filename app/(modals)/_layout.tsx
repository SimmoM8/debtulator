import { Stack } from "expo-router";

import { useAppTheme } from "@/src/theme";

export default function ModalsLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,

        headerStyle: {
          backgroundColor: theme.colors.appBackground,
        },

        headerTintColor: theme.colors.text,

        headerShadowVisible: false,

        contentStyle: {
          backgroundColor: theme.colors.appBackground,
        },
      }}
    >
      <Stack.Screen name="debt" />
    </Stack>
  );
}
