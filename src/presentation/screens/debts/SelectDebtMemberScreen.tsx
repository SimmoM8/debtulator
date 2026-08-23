import { router, Stack } from "expo-router";
import { View } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";

export function SelectDebtMemberScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Select Member",
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
        <Stack.Toolbar.Button
          icon={toolbarIcons.plus}
          accessibilityLabel="Add member"
          onPress={() => {
            // Add Member later.
          }}
        />
      </Stack.Toolbar>

      <View style={{ flex: 1 }} />
    </>
  );
}
