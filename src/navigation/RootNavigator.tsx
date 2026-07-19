import { Stack } from "expo-router";

export function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member/[id]" />
      <Stack.Screen name="member/form" />
      <Stack.Screen name="debt/[id]" />
      <Stack.Screen name="debt/form" />
      <Stack.Screen name="debt/history" />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="group/form" />
      <Stack.Screen name="expense/[id]" />
      <Stack.Screen name="expense/form" />
      <Stack.Screen name="attachment/[id]" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="export" />
      <Stack.Screen name="full-export" />
      <Stack.Screen name="import-csv" />
      <Stack.Screen name="suggestions" />
      <Stack.Screen name="sync" />
      <Stack.Screen name="conflicts" />
      <Stack.Screen name="conflict/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="language" />
      <Stack.Screen name="accessibility" />
      <Stack.Screen name="payment/[id]" />
      <Stack.Screen name="payment/form" />
      <Stack.Screen name="settlement/[id]" />
      <Stack.Screen name="recurring/index" />
      <Stack.Screen name="recurring/form" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="first-run" />
    </Stack>
  );
}
