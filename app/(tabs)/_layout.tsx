import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MobileMenuModal,
  type MenuListSection,
} from "@/src/components/ui/MenuList";
import { FloatingAddButton } from "@/src/components/ui/Finance";

export default function TabLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const quickActionSections = useMemo<MenuListSection[]>(
    () => [
      {
        items: [
          {
            label: "Add debt",
            subtitle: "Create a new debt entry",
            icon: "receipt",
            onPress: () => {
              setMenuOpen(false);
              router.push("/debt/form");
            },
          },
          {
            label: "Add member",
            subtitle: "Create a new member",
            icon: "person-add",
            onPress: () => {
              setMenuOpen(false);
              router.push("/member/form");
            },
          },
          {
            label: "Add expense",
            subtitle: "Create a new expense",
            icon: "pie-chart",
            onPress: () => {
              setMenuOpen(false);
              router.push("/expense/form");
            },
          },
          {
            label: "Add group",
            subtitle: "Create a new group",
            icon: "calendar",
            onPress: () => {
              setMenuOpen(false);
              router.push("/group/form");
            },
          },
        ],
      },
    ],
    [],
  );

  return (
    <View style={styles.container}>
      <NativeTabs>
        <NativeTabs.Trigger name="home" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: "house", selected: "house.fill" }}
            md={{ default: "home", selected: "home" }}
          />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="members" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: "person.2", selected: "person.2.fill" }}
            md={{ default: "people", selected: "people" }}
          />
          <NativeTabs.Trigger.Label>Members</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="debts" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: "creditcard", selected: "creditcard.fill" }}
            md={{ default: "credit_card", selected: "credit_card" }}
          />
          <NativeTabs.Trigger.Label>Debts</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="groups" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon
            sf={{ default: "person.3", selected: "person.3.fill" }}
            md={{ default: "groups", selected: "groups" }}
          />
          <NativeTabs.Trigger.Label>Groups</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="requests" hidden>
          <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings" hidden>
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      <View pointerEvents="box-none" style={styles.fabLayer}>
        <View style={[styles.fabWrap, { bottom: insets.bottom + 34 }]}>
          <FloatingAddButton
            accessibilityLabel={menuOpen ? "Close quick actions" : "Open quick actions"}
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen((current) => !current)}
          />
        </View>
      </View>

      <MobileMenuModal
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        sections={quickActionSections}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabLayer: {
    position: "absolute",
    inset: 0,
  },
  fabWrap: {
    position: "absolute",
    alignSelf: "center",
  },
});
