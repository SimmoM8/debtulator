import { Stack } from "expo-router";

export default function GroupsStackLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Groups" }}>
      <Stack.Screen name="index" options={{ title: "Groups" }} />
      <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
      <Stack.Screen name="group/form" options={{ title: "Group", presentation: "formSheet", sheetGrabberVisible: true }} />
      <Stack.Screen name="expense/[id]" options={{ title: "Expense" }} />
      <Stack.Screen name="expense/form" options={{ title: "Expense", presentation: "formSheet", sheetGrabberVisible: true }} />
      <Stack.Screen name="attachment/[id]" options={{ title: "Attachment" }} />
      <Stack.Screen name="settlement/[id]" options={{ title: "Settlement" }} />
    </Stack>
  );
}
