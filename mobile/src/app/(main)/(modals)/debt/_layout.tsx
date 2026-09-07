import { router, Stack } from "expo-router";

import {
  NewDebtProvider,
  useNewDebt,
} from "@/src/features/debts/state/NewDebtProvider";
import { NewMemberProvider } from "@/src/features/members/state/NewMemberProvider";
import { useAppTheme } from "@/src/theme";

export default function DebtModalLayout() {
  return (
    <NewDebtProvider>
      <DebtModalFlow />
    </NewDebtProvider>
  );
}

function DebtModalFlow() {
  const debtDraft = useNewDebt();

  return (
    <NewMemberProvider
      onCancel={() => {
        router.back();
      }}
      onCreated={(member) => {
        debtDraft.setMemberId(member.id);

        router.dismissTo("/(main)/(modals)/debt/new");
      }}
    >
      <DebtModalNavigator />
    </NewMemberProvider>
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
