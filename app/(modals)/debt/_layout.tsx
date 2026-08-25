import { Stack } from "expo-router";

import { NewDebtDraftProvider } from "@/src/presentation/providers/NewDebtDraftProvider";
import { colors } from "@/src/theme";

export default function DebtModalLayout() {
  return (
    <NewDebtDraftProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerLargeTitle: false,
          headerTitleAlign: "center",

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
