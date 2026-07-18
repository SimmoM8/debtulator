import { Stack } from "expo-router";

export default function SettingsStackLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Settings" }}>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="recurring/index" options={{ title: "Recurring Records" }} />
      <Stack.Screen name="recurring/form" options={{ title: "Recurring Record", presentation: "formSheet", sheetGrabberVisible: true }} />
      <Stack.Screen name="sync" options={{ title: "Sync Status" }} />
      <Stack.Screen name="conflicts" options={{ title: "Conflict Center" }} />
      <Stack.Screen name="conflict/[id]" options={{ title: "Conflict Review" }} />
      <Stack.Screen name="backup" options={{ title: "Backup & Restore" }} />
      <Stack.Screen name="export" options={{ title: "Import & Export" }} />
      <Stack.Screen name="full-export" options={{ title: "Full Data Export" }} />
      <Stack.Screen name="import-csv" options={{ title: "Import CSV", presentation: "formSheet", sheetGrabberVisible: true }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      <Stack.Screen name="delete-account" options={{ title: "Delete Account" }} />
      <Stack.Screen name="language" options={{ title: "Language" }} />
      <Stack.Screen name="accessibility" options={{ title: "Accessibility & Help" }} />
    </Stack>
  );
}
