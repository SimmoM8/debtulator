import { router, Stack } from "expo-router";

import { NewMemberProvider } from "@/src/features/members/state/NewMemberProvider";

import { SolidNavHeader } from "@/src/components/layout/SolidNavHeader";

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
  return (
    <SolidNavHeader>
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
    </SolidNavHeader>
  );
}
