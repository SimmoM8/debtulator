import { Stack } from "expo-router";

export default function MembersStackLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Members" }}>
      <Stack.Screen name="index" options={{ title: "Members" }} />
      <Stack.Screen name="member/[id]" options={{ title: "Member" }} />
      <Stack.Screen name="member/form" options={{ title: "Member", presentation: "formSheet", sheetGrabberVisible: true }} />
    </Stack>
  );
}
