import { Tabs } from "expo-router";
import React from "react";

import { GlassBottomTabBar } from "@/src/components/navigation/GlassBottomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <GlassBottomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
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
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          href: null,
        }}
      />
    </Tabs>
  );
}
