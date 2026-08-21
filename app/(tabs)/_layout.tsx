import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="debts"
        options={{
          title: "Debts",
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
        }}
      />
    </Tabs>
  );
}
