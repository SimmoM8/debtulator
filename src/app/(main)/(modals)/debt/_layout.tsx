import { Stack } from "expo-router";

import { NewDebtProvider } from "@/src/features/debts/state/NewDebtProvider";

import { useAppTheme } from "@/src/theme";

export default function DebtModalLayout() {
  return (
    <NewDebtProvider>
      <DebtModalNavigator />
    </NewDebtProvider>
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

      <Stack.Screen
        name="new-member"
        options={{
          title: "New Member",
        }}
      />
    </Stack>
  );
}
