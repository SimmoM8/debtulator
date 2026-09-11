import { Stack } from "expo-router";
import type { PropsWithChildren } from "react";

import { useAppTheme } from "@/src/theme";

export function SolidNavHeader({ children }: PropsWithChildren) {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTitleAlign: "center",
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
      {children}
    </Stack>
  );
}
