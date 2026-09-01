import { router, Stack } from "expo-router";

import { NavHeader } from "@/src/components/layout";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";

export default function MembersLayout() {
  return (
    <NavHeader>
      <Stack.Screen
        name="index"
        options={{
          title: "Members",
        }}
      >
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={toolbarIcons.magnifyingglass}
            accessibilityLabel="Search members"
            onPress={() => {
              // Search members
            }}
          />
        </Stack.Toolbar>

        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={toolbarIcons.plus}
            accessibilityLabel="Add member"
            onPress={() => {
              router.push("/(main)/(modals)/member/new");
            }}
          />

          <Stack.Toolbar.Menu icon={toolbarIcons.ellipsis}>
            <Stack.Toolbar.MenuAction
              onPress={() => {
                // Filter members
              }}
            >
              Filter
            </Stack.Toolbar.MenuAction>

            <Stack.Toolbar.MenuAction
              onPress={() => {
                // Sort members
              }}
            >
              Sort
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </Stack.Screen>

      <Stack.Screen
        name="[memberId]"
        options={{
          title: "Member",
        }}
      >
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon={toolbarIcons.ellipsis}>
            <Stack.Toolbar.MenuAction
              onPress={() => {
                // Edit member
              }}
            >
              Edit
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </Stack.Screen>
    </NavHeader>
  );
}
