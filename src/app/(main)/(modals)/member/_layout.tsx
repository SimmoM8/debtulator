import { Stack } from "expo-router";

import { useAppTheme } from "@/src/theme";

export default function MemberModalLayout() {
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
      <Stack.Screen
        name="new"
        options={{
          title: "New Member",
        }}
      />
    </Stack>
  );
}
