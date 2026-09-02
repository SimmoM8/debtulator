import { Stack } from "expo-router";

import { NavHeader } from "@/src/components/layout";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { openNewDebt } from "@/src/features/debts/operations/openNewDebt";

export default function DebtsLayout() {
  return (
    <NavHeader>
      <Stack.Screen
        name="index"
        options={{
          title: "Debts",
        }}
      >
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={toolbarIcons.magnifyingglass}
            accessibilityLabel="Search debts"
            onPress={() => {
              // Search debts
            }}
          />
        </Stack.Toolbar>

        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={toolbarIcons.plus}
            accessibilityLabel="Add debt"
            onPress={() => {
              openNewDebt();
            }}
          />

          <Stack.Toolbar.Menu icon={toolbarIcons.ellipsis}>
            <Stack.Toolbar.MenuAction
              onPress={() => {
                // Filter debts
              }}
            >
              Filter
            </Stack.Toolbar.MenuAction>

            <Stack.Toolbar.MenuAction
              onPress={() => {
                // Sort debts
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
