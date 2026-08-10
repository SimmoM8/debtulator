import { Stack } from "expo-router";

import {
  IOS_COMPACT_HEADER_OPTIONS,
  IOS_LARGE_HEADER_OPTIONS,
  IOS_LARGE_TITLE_STYLE,
} from "@/src/components/ios/NativeNavigationStyle";

export default function MembersStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...IOS_COMPACT_HEADER_OPTIONS,
        headerBackTitle: "Members",
      }}
    >
      <Stack.Screen name="index" options={IOS_LARGE_HEADER_OPTIONS}>
        <Stack.Title large largeStyle={IOS_LARGE_TITLE_STYLE}>
          Members
        </Stack.Title>
      </Stack.Screen>
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
