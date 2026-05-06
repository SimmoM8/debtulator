import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { palette } from '@/src/constants/design';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.faint,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          minHeight: 72,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="people" color={color} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="receipt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="notifications" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={22} name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
