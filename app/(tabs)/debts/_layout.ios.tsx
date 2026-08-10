import { Stack } from "expo-router";

import {
  IOS_COMPACT_HEADER_OPTIONS,
  IOS_LARGE_HEADER_OPTIONS,
  IOS_LARGE_TITLE_STYLE,
} from "@/src/components/ios/NativeNavigationStyle";

export default function DebtsStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...IOS_COMPACT_HEADER_OPTIONS,
        headerBackTitle: "Debts",
      }}
    >
      <Stack.Screen name="index" options={IOS_LARGE_HEADER_OPTIONS}>
        <Stack.Title large largeStyle={IOS_LARGE_TITLE_STYLE}>
          Debts
        </Stack.Title>
      </Stack.Screen>
      <Stack.Screen name="debt/[id]" options={{ title: "Debt" }} />
      <Stack.Screen name="debt/history" options={{ title: "Settled Debts" }} />
      <Stack.Screen
        name="debt/form"
        options={{
          title: "Debt",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="payment/[id]" options={{ title: "Payment" }} />
      <Stack.Screen
        name="payment/form"
        options={{
          title: "Record Payment",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="settlement/[id]" options={{ title: "Settlement" }} />
    </Stack>
  );
}
