import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { GlassCard, StatusPill } from "@/src/components/ui/Finance";
import { IconButton } from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = {
  label: string;
  subtitle: string;
  href: Parameters<typeof router.push>[0];
  icon: IconName;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const sections: MenuSection[] = [
  {
    title: "Browse",
    items: [
      {
        label: "Home",
        subtitle: "Snapshot, due soon, and recent activity",
        href: "/",
        icon: "home-outline",
      },
      {
        label: "Debts",
        subtitle: "What you owe and what is owed to you",
        href: "/debts",
        icon: "wallet-outline",
      },
      {
        label: "Members",
        subtitle: "People, balances, and linked profiles",
        href: "/members",
        icon: "people-outline",
      },
      {
        label: "Events",
        subtitle: "Trips, groups, and shared expense spaces",
        href: "/events",
        icon: "calendar-outline",
      },
      {
        label: "Requests",
        subtitle: "Approvals, invites, and what needs your answer",
        href: "/requests",
        icon: "notifications-outline",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        label: "Recurring",
        subtitle: "Repeat the things you track often",
        href: "/recurring",
        icon: "repeat-outline",
      },
      {
        label: "Analytics",
        subtitle: "See patterns across debts and payments",
        href: "/analytics",
        icon: "stats-chart-outline",
      },
      {
        label: "Suggestions",
        subtitle: "Review smart nudges before using them",
        href: "/suggestions",
        icon: "sparkles-outline",
      },
      {
        label: "Export",
        subtitle: "Keep a copy of your ledger",
        href: "/export",
        icon: "download-outline",
      },
      {
        label: "Full export",
        subtitle: "Complete local account data as JSON",
        href: "/full-export",
        icon: "document-text-outline",
      },
      {
        label: "Import CSV",
        subtitle: "Bring in older records carefully",
        href: "/import-csv",
        icon: "cloud-upload-outline",
      },
    ],
  },
  {
    title: "Safety",
    items: [
      {
        label: "Settings",
        subtitle: "Preferences, defaults, and account controls",
        href: "/settings",
        icon: "settings-outline",
      },
      {
        label: "Sync",
        subtitle: "Everything synced, waiting, or needing review",
        href: "/sync",
        icon: "sync-outline",
      },
      {
        label: "Conflicts",
        subtitle: "Compare changes and resolve differences",
        href: "/conflicts",
        icon: "git-compare-outline",
      },
      {
        label: "Backup",
        subtitle: "Stored safely on this device",
        href: "/backup",
        icon: "archive-outline",
      },
      {
        label: "Privacy",
        subtitle: "Private, shared, and export visibility rules",
        href: "/privacy",
        icon: "lock-closed-outline",
      },
      {
        label: "Notifications",
        subtitle: "Adjust reminders and shared updates",
        href: "/notifications",
        icon: "notifications-circle-outline",
      },
    ],
  },
];

export function AppMenuButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentLabel = useMemo(() => {
    for (const section of sections) {
      const match = section.items.find((item) => item.href === pathname);
      if (match) {
        return match.label;
      }
    }
    return "Browse";
  }, [pathname]);

  return (
    <>
      <IconButton
        icon="menu-outline"
        label="Open navigation menu"
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessible={false}
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <GlassCard tone="lavender" style={styles.menuCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Navigate</Text>
              </View>
              <View style={styles.headerMeta}>
                <StatusPill label={currentLabel} tone="indigo" />
                <IconButton
                  icon="close"
                  label="Close navigation menu"
                  onPress={() => setOpen(false)}
                />
              </View>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sectionList}
            >
              {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.itemList}>
                    {section.items.map((item) => {
                      const active = item.href === pathname;
                      return (
                        <Pressable
                          key={item.label}
                          accessibilityRole="button"
                          accessibilityLabel={item.label}
                          accessibilityHint={item.subtitle}
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            setOpen(false);
                            if (!active) {
                              router.navigate(item.href);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.item,
                            active && styles.itemActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View
                            style={[
                              styles.itemIcon,
                              active && styles.itemIconActive,
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={18}
                              color={active ? palette.surface : palette.primary}
                            />
                          </View>
                          <View style={styles.itemCopy}>
                            <Text
                              style={[
                                styles.itemLabel,
                                active && styles.itemLabelActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                            <Text
                              style={[
                                styles.itemSubtitle,
                                active && styles.itemSubtitleActive,
                              ]}
                            >
                              {item.subtitle}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={
                              active ? palette.surface : palette.textTertiary
                            }
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(17,24,39,0.18)",
    paddingHorizontal: spacing.screen,
    paddingTop: 70,
    paddingBottom: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    maxHeight: "88%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerMeta: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  title: {
    color: palette.textPrimary,
    fontSize: typography.size.h1,
    fontFamily: typefaces.displayMedium,
  },
  sectionList: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.primary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.3,
  },
  itemList: {
    gap: spacing.sm,
  },
  item: {
    minHeight: 68,
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
  itemActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(55,48,163,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyStrong,
  },
  itemLabelActive: {
    color: palette.surface,
  },
  itemSubtitle: {
    color: palette.textTertiary,
    fontSize: typography.size.sm,
    lineHeight: typography.line.basePlus,
    fontFamily: typefaces.body,
  },
  itemSubtitleActive: {
    color: "rgba(255,255,255,0.78)",
  },
  pressed: {
    opacity: 0.8,
  },
});
