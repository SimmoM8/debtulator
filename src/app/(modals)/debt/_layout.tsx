import { Stack } from "expo-router";

import { NewDebtDraftProvider } from "@/src/presentation/providers/NewDebtDraftProvider";
import { NewDebtFlowProvider } from "@/src/presentation/providers/NewDebtFlowProvider";
import { useAppTheme } from "@/src/theme";

export default function DebtModalLayout() {
  return (
    <NewDebtDraftProvider>
      <NewDebtFlowProvider>
        <DebtModalNavigator />
      </NewDebtFlowProvider>
    </NewDebtDraftProvider>
  );
}

function DebtModalNavigator() {
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
          title: "New Debt",

          animation:
            process.env.EXPO_OS === "android" ? "slide_from_left" : "default",

          animationTypeForReplace: "pop",
        }}
      />

      <Stack.Screen
        name="select-member"
        options={{
          title: "Select Member",
        }}
      />
    </Stack>
  );
}
