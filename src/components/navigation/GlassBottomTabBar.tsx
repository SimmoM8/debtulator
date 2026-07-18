import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FloatingAddButton,
  GlassBackdrop,
  GlassCard,
} from "@/src/components/ui/Finance";
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
    name: "groups",
    label: "Groups",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
];

const quickActions: {
  label: string;
  icon: IconName;
  href: Parameters<typeof router.push>[0];
}[] = [
  {
    label: "Add debt",
    icon: "receipt",
    href: "/debt/form",
  },
  {
    label: "Add member",
    icon: "person-add",
    href: "/member/form",
  },
  {
    label: "Add expense",
    icon: "pie-chart",
    href: "/expense/form",
  },
  {
    label: "Add group",
    icon: "calendar",
    href: "/group/form",
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
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          accessible={false}
          style={styles.overlay}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            accessible={false}
            style={[styles.menuWrap, { bottom: 112 + insets.bottom }]}
            onPress={(event) => event.stopPropagation()}
          >
            <GlassCard
              tone="lavender"
              style={styles.menuCard}
              wrapperStyle={styles.menuCardWrap}
            >
              <View style={styles.actionList}>
                {quickActions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={() => {
                      setMenuOpen(false);
                      router.push(action.href);
                    }}
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={22}
                      color={palette.primary}
                    />
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={[styles.barWrap, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.barShadow}>
          <View style={styles.barSurface}>
            <GlassBackdrop intensity={26} />
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
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
  },
  menuWrap: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    alignItems: "center",
  },
  menuCard: {
    width: "100%",
  },
  menuCardWrap: {
    width: "100%",
    maxWidth: 360,
  },
  actionList: {
    gap: spacing.sm,
  },
  actionRow: {
    minHeight: 56,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionLabel: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyStrong,
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
    overflow: "visible",
    backgroundColor:
      Platform.OS === "android" ? palette.surface : "transparent",
    ...shadows.card,
  },
  barSurface: {
    minHeight: 84,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassStrong,
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
