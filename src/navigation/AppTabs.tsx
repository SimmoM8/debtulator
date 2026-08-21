import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { AppIcon } from "@/src/components/icons";

import { Tabs } from "expo-router";

import { tabRoutes } from "./tabRoutes";

export default function AppTabs() {
  if (Platform.OS === "ios") {
    return (
      <NativeTabs>
        {tabRoutes.map((route) => (
          <NativeTabs.Trigger key={route.name} name={route.name}>
            <NativeTabs.Trigger.Label>{route.title}</NativeTabs.Trigger.Label>

            <NativeTabs.Trigger.Icon sf={route.iosIcon} />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      {tabRoutes.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            tabBarIcon: ({ color, size }) => (
              <AppIcon name={route.androidIcon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
