import { Stack } from "expo-router";

import { NewDebtDraftProvider } from "@/src/presentation/providers/NewDebtDraftProvider";

import { useAppTheme } from "@/src/theme";

export default function DebtModalLayout() {
  const theme = useAppTheme();

  return (
    <NewDebtDraftProvider>
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
            animation:
              process.env.EXPO_OS === "android" ? "slide_from_left" : "default",

            animationTypeForReplace: "pop",
          }}
        />

        <Stack.Screen name="select-member" />
      </Stack>
    </NewDebtDraftProvider>
  );
}
