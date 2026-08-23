import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { AddDebtForm } from "@/src/presentation/components/debts/AddDebtForm";
import { DebtsScreen } from "@/src/presentation/screens/DebtsScreen";
import { Stack } from "expo-router";
import { useState } from "react";

export default function DebtsRoute() {
  const [isAddDebtPresented, setIsAddDebtPresented] = useState(false);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Debts",
        }}
      />

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
            setIsAddDebtPresented(true);
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

      <DebtsScreen />

      <AddDebtForm
        isPresented={isAddDebtPresented}
        onDismiss={() => setIsAddDebtPresented(false)}
      />
    </>
  );
}
