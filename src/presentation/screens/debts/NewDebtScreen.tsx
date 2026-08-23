import { router, Stack } from "expo-router";
import { View } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";

export function NewDebtScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "New Debt",
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Close"
          onPress={() => {
            router.dismiss();
          }}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button accessibilityLabel="Create debt" disabled>
          Create
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <View style={{ flex: 1 }} />
    </>
  );
}
