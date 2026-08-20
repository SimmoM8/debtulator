import { Stack } from "expo-router";

import {
  IOS_COMPACT_HEADER_OPTIONS,
  IOS_LARGE_HEADER_OPTIONS,
  IOS_LARGE_TITLE_STYLE,
} from "@/src/presentation/navigation/NativeNavigationStyle";

export default function GroupsStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...IOS_COMPACT_HEADER_OPTIONS,
        headerBackTitle: "Groups",
      }}
    >
      <Stack.Screen name="index" options={IOS_LARGE_HEADER_OPTIONS}>
        <Stack.Title large largeStyle={IOS_LARGE_TITLE_STYLE}>
          Groups
        </Stack.Title>
      </Stack.Screen>
      <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
      <Stack.Screen
        name="group/form"
        options={{
          title: "Group",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="expense/[id]" options={{ title: "Expense" }} />
      <Stack.Screen
        name="expense/form"
        options={{
          title: "Expense",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="attachment/[id]" options={{ title: "Attachment" }} />
      <Stack.Screen name="settlement/[id]" options={{ title: "Settlement" }} />
    </Stack>
  );
}
