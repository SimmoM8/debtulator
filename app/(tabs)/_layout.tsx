import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { palette, typefaces } from "@/src/constants/design";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.faint,
        tabBarBackground: () => (
          <BlurView
            tint="light"
            intensity={28}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 14,
          minHeight: 76,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: "transparent",
          borderTopColor: "transparent",
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          borderRadius: 30,
          overflow: "hidden",
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 22,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typefaces.bodyStrong,
        },
        tabBarItemStyle: {
          paddingTop: 2,
          borderRadius: 20,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons size={22} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarIcon: ({ color }) => (
            <Ionicons size={22} name="people" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: "Debts",
          tabBarIcon: ({ color }) => (
            <Ionicons size={22} name="receipt" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => (
            <Ionicons size={22} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => (
            <Ionicons size={22} name="notifications" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Ionicons size={22} name="settings" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
