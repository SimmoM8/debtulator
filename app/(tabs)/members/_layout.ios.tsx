import { Stack } from "expo-router";

import { IOS_COMPACT_HEADER_OPTIONS } from "@/src/components/ios/NativeNavigationStyle";

export default function MembersStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...IOS_COMPACT_HEADER_OPTIONS,
        headerBackTitle: "Members",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Members" }} />
      <Stack.Screen name="member/[id]" options={{ title: "Member" }} />
      <Stack.Screen
        name="member/form"
        options={{
          title: "Member",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
