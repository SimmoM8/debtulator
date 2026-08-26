import { router, Stack } from "expo-router";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";

import { NavHeader } from "@/src/presentation/components/layout";

export default function DebtsLayout() {
  return (
    <NavHeader>
      <Stack.Screen
        name="index"
        options={{
          title: "Debts",
          headerLeft: () => (
            <Stack.Toolbar.Button
              icon={toolbarIcons.magnifyingglass}
              accessibilityLabel="Search debts"
              onPress={() => {
                // Search debts
              }}
            />
          ),
          headerRight: () => (
            <>
              <Stack.Toolbar.Button
                icon={toolbarIcons.plus}
                accessibilityLabel="Add debt"
                onPress={() => {
                  router.push("/(modals)/debt/select-member");
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
            </>
          ),
        }}
      />
    </NavHeader>
  );
}
