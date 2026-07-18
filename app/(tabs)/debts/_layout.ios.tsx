import { Stack } from "expo-router";

export default function DebtsStackLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Debts" }}>
      <Stack.Screen name="index" options={{ title: "Debts" }} />
      <Stack.Screen name="debt/[id]" options={{ title: "Debt" }} />
      <Stack.Screen name="debt/history" options={{ title: "Settled Debts" }} />
      <Stack.Screen name="debt/form" options={{ title: "Debt", presentation: "formSheet", sheetGrabberVisible: true }} />
      <Stack.Screen name="payment/[id]" options={{ title: "Payment" }} />
      <Stack.Screen name="payment/form" options={{ title: "Record Payment", presentation: "formSheet", sheetGrabberVisible: true }} />
      <Stack.Screen name="settlement/[id]" options={{ title: "Settlement" }} />
    </Stack>
  );
}
