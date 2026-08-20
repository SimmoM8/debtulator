import { router, usePathname, type Href } from "expo-router";
import React, { useMemo, useState } from "react";

import {
  MobileMenuModal,
  type MenuIconName,
  type MenuListSection,
} from "@/src/presentation/design-system/MenuList";
import { IconButton } from "@/src/presentation/design-system/Primitives";
import { routes } from '@/src/presentation/navigation/routes';

type MenuItem = {
  label: string;
  subtitle: string;
  href: Href;
  activePath: string;
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
        href: routes.home(),
        activePath: "/home",
        icon: "home-outline",
      },
      {
        label: "Debts",
        subtitle: "What you owe and what is owed to you",
        href: routes.debts(),
        activePath: "/debts",
        icon: "wallet-outline",
      },
      {
        label: "Members",
        subtitle: "People, balances, and linked profiles",
        href: routes.members(),
        activePath: "/members",
        icon: "people-outline",
      },
      {
        label: "Groups",
        subtitle: "Trips, groups, and shared expense spaces",
        href: routes.groups(),
        activePath: "/groups",
        icon: "calendar-outline",
      },
      {
        label: "Requests",
        subtitle: "Approvals, invites, and what needs your answer",
        href: routes.requests(),
        activePath: "/home/requests",
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
        href: routes.recurringTemplates(),
        activePath: "/settings/recurring",
        icon: "repeat-outline",
      },
      {
        label: "Analytics",
        subtitle: "See patterns across debts and payments",
        href: routes.analytics(),
        activePath: "/home/analytics",
        icon: "stats-chart-outline",
      },
      {
        label: "Suggestions",
        subtitle: "Review smart nudges before using them",
        href: routes.suggestions(),
        activePath: "/home/suggestions",
        icon: "sparkles-outline",
      },
      {
        label: "Export",
        subtitle: "Keep a copy of your ledger",
        href: routes.exportData(),
        activePath: "/settings/export",
        icon: "download-outline",
      },
      {
        label: "Full export",
        subtitle: "Complete local account data as JSON",
        href: routes.fullExport(),
        activePath: "/settings/full-export",
        icon: "document-text-outline",
      },
      {
        label: "Import CSV",
        subtitle: "Bring in older records carefully",
        href: routes.importCsv(),
        activePath: "/settings/import-csv",
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
        href: routes.settings(),
        activePath: "/settings",
        icon: "settings-outline",
      },
      {
        label: "Sync",
        subtitle: "Everything synced, waiting, or needing review",
        href: routes.sync(),
        activePath: "/settings/sync",
        icon: "sync-outline",
      },
      {
        label: "Conflicts",
        subtitle: "Compare changes and resolve differences",
        href: routes.conflicts(),
        activePath: "/settings/conflicts",
        icon: "git-compare-outline",
      },
      {
        label: "Backup",
        subtitle: "Stored safely on this device",
        href: routes.backup(),
        activePath: "/settings/backup",
        icon: "archive-outline",
      },
      {
        label: "Privacy",
        subtitle: "Private, shared, and export visibility rules",
        href: routes.privacy(),
        activePath: "/settings/privacy",
        icon: "lock-closed-outline",
      },
      {
        label: "Notifications",
        subtitle: "Adjust reminders and shared updates",
        href: routes.notifications(),
        activePath: "/settings/notifications",
        icon: "notifications-circle-outline",
      },
    ],
  },
];

export function AppMenuButton({
  tone = "default",
}: {
  tone?: React.ComponentProps<typeof IconButton>["tone"];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const menuSections = useMemo<MenuListSection[]>(
    () =>
      sections.map((section) => ({
        title: section.title,
        items: section.items.map((item) => {
          const active = item.activePath === pathname;
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
        tone={tone}
        onPress={() => setOpen(true)}
      />
      <MobileMenuModal
        visible={open}
        sections={menuSections}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
