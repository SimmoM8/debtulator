import { Stack } from "expo-router";

import {
  IOS_COMPACT_HEADER_OPTIONS,
  IOS_LARGE_HEADER_OPTIONS,
} from "@/src/components/ios/NativeNavigationStyle";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ ...IOS_COMPACT_HEADER_OPTIONS, headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ ...IOS_LARGE_HEADER_OPTIONS, title: "Home" }} />
      <Stack.Screen name="requests" options={{ title: "Requests" }} />
      <Stack.Screen name="activity" options={{ title: "Activity" }} />
      <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
      <Stack.Screen name="suggestions" options={{ title: "Suggestions" }} />
    </Stack>
  );
}
