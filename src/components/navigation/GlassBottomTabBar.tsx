import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingAddButton, GlassCard } from "@/src/components/ui/Finance";
import { MenuListContent } from "@/src/components/ui/MenuList";
import {
    palette,
    radii,
    shadows,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";

type IconName = keyof typeof Ionicons.glyphMap;

type TabConfig = {
  name: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

const visibleTabs: TabConfig[] = [
  { name: "index", label: "Home", icon: "home-outline", activeIcon: "home" },
  {
    name: "debts",
    label: "Debts",
    icon: "wallet-outline",
    activeIcon: "wallet",
  },
  {
    name: "members",
    label: "Members",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    name: "events",
    label: "Events",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
];

const quickActions: {
  label: string;
  subtitle: string;
  icon: IconName;
  href: Parameters<typeof router.push>[0];
}[] = [
  {
    label: "Add debt",
    subtitle: "Create a simple balance with one person",
    icon: "receipt-outline",
    href: "/debt/form",
  },
  {
    label: "Record payment",
    subtitle: "Log money movement against open balances",
    icon: "card-outline",
    href: "/payment/form",
  },
  {
    label: "Split expense",
    subtitle: "Add an event expense and calculate shares",
    icon: "pie-chart-outline",
    href: "/expense/form",
  },
  {
    label: "Invite member",
    subtitle: "Create a member profile for debts and events",
    icon: "person-add-outline",
    href: "/member/form",
  },
  {
    label: "Add event",
    subtitle: "Start a trip, household, or shared space",
    icon: "calendar-outline",
    href: "/event/form",
  },
];

export function GlassBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const activeRouteName = state.routes[state.index]?.name;
  function handleTabPress(routeName: string) {
    const route = state.routes.find((item) => item.name === routeName);
    if (!route) {
      return;
    }

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {menuOpen ? (
        <Pressable
          accessible={false}
          style={styles.overlay}
          onPress={() => setMenuOpen(false)}
        />
      ) : null}
      {menuOpen ? (
        <View
          pointerEvents="box-none"
          style={[styles.menuWrap, { bottom: 112 + insets.bottom }]}
        >
          <GlassCard tone="lavender" style={styles.menuCard}>
            <MenuListContent
              sections={[
                {
                  title: "Quick actions",
                  items: quickActions.map((action) => ({
                    label: action.label,
                    subtitle: action.subtitle,
                    icon: action.icon,
                    onPress: () => {
                      setMenuOpen(false);
                      router.push(action.href);
                    },
                  })),
                },
              ]}
            />
          </GlassCard>
        </View>
      ) : null}
      <View style={[styles.barWrap, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.barShadow}>
          <BlurView
            tint="light"
            intensity={26}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bar}>
            {visibleTabs.slice(0, 2).map((tab) => (
              <TabItem
                key={tab.name}
                config={tab}
                active={activeRouteName === tab.name}
                onPress={() => {
                  setMenuOpen(false);
                  handleTabPress(tab.name);
                }}
                badge={
                  descriptors[
                    state.routes.find((route) => route.name === tab.name)
                      ?.key ?? ""
                  ]?.options?.tabBarBadge
                }
              />
            ))}
            <View style={styles.centerSpace} />
            {visibleTabs.slice(2).map((tab) => (
              <TabItem
                key={tab.name}
                config={tab}
                active={activeRouteName === tab.name}
                onPress={() => {
                  setMenuOpen(false);
                  handleTabPress(tab.name);
                }}
                badge={
                  descriptors[
                    state.routes.find((route) => route.name === tab.name)
                      ?.key ?? ""
                  ]?.options?.tabBarBadge
                }
              />
            ))}
          </View>
        </View>
        <View style={[styles.addButtonWrap, { bottom: insets.bottom + 34 }]}>
          <FloatingAddButton
            accessibilityLabel={
              menuOpen ? "Close quick actions" : "Open quick actions"
            }
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen((current) => !current)}
          />
        </View>
      </View>
    </View>
  );
}

function TabItem({
  config,
  active,
  onPress,
  badge,
}: {
  config: TabConfig;
  active: boolean;
  onPress: () => void;
  badge?: string | number;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${config.label}, has updates` : config.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={active ? config.activeIcon : config.icon}
          size={20}
          color={active ? palette.primary : palette.muted}
        />
        {badge ? <View style={styles.badgeDot} /> : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {config.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.14)",
  },
  menuWrap: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    alignItems: "center",
  },
  menuCard: {
    width: "100%",
    maxWidth: 360,
  },
  barWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
  },
  barShadow: {
    minHeight: 84,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlass,
    ...shadows.card,
  },
  bar: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  centerSpace: {
    width: 72,
  },
  addButtonWrap: {
    position: "absolute",
    alignSelf: "center",
  },
  tabItem: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    color: palette.muted,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
  },
  tabLabelActive: {
    color: palette.primary,
  },
  badgeDot: {
    position: "absolute",
    top: -1,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: palette.danger,
  },
  pressed: {
    opacity: 0.75,
  },
});
