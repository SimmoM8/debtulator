import { Stack } from "expo-router";

import { DebtsScreen } from "@/src/presentation/screens/DebtsScreen";

export default function DebtsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Debts",
          headerLargeTitle: true,
        }}
      />

      <DebtsScreen />
    </>
  );
}
