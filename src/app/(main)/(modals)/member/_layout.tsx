import { router, Stack } from "expo-router";

import { NewMemberProvider } from "@/src/features/members/state/NewMemberProvider";

import { useAppTheme } from "@/src/theme";

export default function MemberModalLayout() {
  return (
    <NewMemberProvider
      onCancel={() => {
        router.dismiss();
      }}
      onCreated={() => {
        router.dismiss();
      }}
    >
      <MemberModalNavigator />
    </NewMemberProvider>
  );
}

function MemberModalNavigator() {
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

      <Stack.Screen
        name="link"
        options={{
          title: "Link Member",
        }}
      />
    </Stack>
  );
}
