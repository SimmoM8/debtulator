import { Stack } from "expo-router";

import { IOS_COMPACT_HEADER_OPTIONS } from "@/src/presentation/navigation/NativeNavigationStyle";
import { palette } from "@/src/presentation/theme/design";

export function RootNavigator() {
  return (
    <Stack
      screenOptions={{
        ...IOS_COMPACT_HEADER_OPTIONS,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth"
        options={{
          title: "Account",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="first-run"
        options={{
          title: "Welcome to Debtulator",
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen name="member/[id]" options={{ title: "Member" }} />
      <Stack.Screen
        name="member/form"
        options={{
          title: "Member",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="debt/[id]" options={{ title: "Debt" }} />
      <Stack.Screen
        name="debt/form"
        options={{
          title: "Debt",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="debt/history" options={{ title: "Settled Debts" }} />
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
      <Stack.Screen name="activity" options={{ title: "Activity" }} />
      <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
      <Stack.Screen name="export" options={{ title: "Import & Export" }} />
      <Stack.Screen
        name="full-export"
        options={{ title: "Full Data Export" }}
      />
      <Stack.Screen
        name="import-csv"
        options={{
          title: "Import CSV",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen name="suggestions" options={{ title: "Suggestions" }} />
      <Stack.Screen name="sync" options={{ title: "Sync Status" }} />
      <Stack.Screen name="conflicts" options={{ title: "Conflict Center" }} />
      <Stack.Screen
        name="conflict/[id]"
        options={{ title: "Conflict Review" }}
      />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="backup" options={{ title: "Backup & Restore" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      <Stack.Screen
        name="delete-account"
        options={{ title: "Delete Account" }}
      />
      <Stack.Screen name="language" options={{ title: "Language" }} />
      <Stack.Screen
        name="accessibility"
        options={{ title: "Accessibility & Help" }}
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
      <Stack.Screen
        name="recurring/index"
        options={{ title: "Recurring Records" }}
      />
      <Stack.Screen
        name="recurring/form"
        options={{
          title: "Recurring Record",
          presentation: "formSheet",
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
