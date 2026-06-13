import { router, usePathname } from "expo-router";
import React, { useMemo, useState } from "react";

import {
  MobileMenuModal,
  type MenuIconName,
  type MenuListSection,
} from "@/src/components/ui/MenuList";
import { IconButton } from "@/src/components/ui/Primitives";

type MenuItem = {
  label: string;
  subtitle: string;
  href: Parameters<typeof router.push>[0];
  icon: MenuIconName;
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
        label: "Groups",
        subtitle: "Trips, groups, and shared expense spaces",
        href: "/groups",
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

  const menuSections = useMemo<MenuListSection[]>(
    () =>
      sections.map((section) => ({
        title: section.title,
        items: section.items.map((item) => {
          const active = item.href === pathname;
          return {
            label: item.label,
            subtitle: item.subtitle,
            icon: item.icon,
            active,
            onPress: () => {
              setOpen(false);
              if (!active) {
                router.navigate(item.href);
              }
            },
          };
        }),
      })),
    [pathname],
  );

  return (
    <>
      <IconButton
        icon="menu-outline"
        label="Open navigation menu"
        onPress={() => setOpen(true)}
      />
      <MobileMenuModal
        visible={open}
        title="Navigate"
        statusLabel={currentLabel}
        sections={menuSections}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
