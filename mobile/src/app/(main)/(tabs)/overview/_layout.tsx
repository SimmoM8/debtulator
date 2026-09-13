import { Stack } from "expo-router";

import { NavHeader } from "@/src/components/layout";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { openInbox } from "@/src/features/inbox/operations/openInbox";

export default function OverviewLayout() {
  return (
    <NavHeader>
      <Stack.Screen
        name="index"
        options={{
          title: "Overview",
        }}
      >
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={toolbarIcons.bell}
            accessibilityLabel="Open Inbox"
            onPress={openInbox}
          />
        </Stack.Toolbar>
      </Stack.Screen>
    </NavHeader>
  );
}
