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
                // More advanced filtering can live here later.
              }}
            >
              Filter
            </Stack.Toolbar.MenuAction>

            <Stack.Toolbar.MenuAction
              onPress={() => {
                // Sorting later.
              }}
            >
              Sort
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </Stack.Screen>
    </NavHeader>
  );
}
