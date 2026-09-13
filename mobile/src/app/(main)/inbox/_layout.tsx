import { Stack } from "expo-router";

import { SolidNavHeader } from "@/src/components/layout/SolidNavHeader";

export default function InboxLayout() {
  return (
    <SolidNavHeader>
      <Stack.Screen
        name="index"
        options={{
          title: "Inbox",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </SolidNavHeader>
  );
}
