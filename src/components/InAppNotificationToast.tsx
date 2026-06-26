import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette, spacing, typefaces, typography } from "@/src/constants/design";
import { notificationEnabled, privacySafeNotificationBody } from "@/src/services/notifications";
import { useAppData } from "@/src/state/AppDataProvider";
import type { AppNotification } from "@/src/types/models";

export function InAppNotificationToast() {
  const data = useAppData();
  const insets = useSafeAreaInsets();
  const seenIds = useRef<Set<string> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleNotification, setVisibleNotification] =
    useState<AppNotification | null>(null);

  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(data.notifications.map((item) => item.id));
      return;
    }

    const nextNotification = data.notifications
      .filter(
        (notification) =>
          !seenIds.current?.has(notification.id) &&
          !notification.readAt &&
          notificationEnabled(notification.type, data.settings),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    for (const notification of data.notifications) {
      seenIds.current.add(notification.id);
    }

    if (!nextNotification) {
      return;
    }

    setVisibleNotification(nextNotification);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setVisibleNotification(null);
      timeoutRef.current = null;
    }, 7500);
  }, [data.notifications, data.settings]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  if (!visibleNotification) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${visibleNotification.title}. Open notifications.`}
        onPress={() => {
          setVisibleNotification(null);
          router.push("/notifications");
        }}
        style={styles.toast}
      >
        <View style={styles.accent} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {visibleNotification.title}
          </Text>
          <Text numberOfLines={2} style={styles.body}>
            {privacySafeNotificationBody(visibleNotification, data.settings)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  toast: {
    width: "100%",
    maxWidth: 520,
    minHeight: 76,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: palette.surfaceGlassStrong,
    shadowColor: palette.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  accent: {
    width: 5,
    backgroundColor: palette.brand,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  title: {
    color: palette.ink,
    fontFamily: typefaces.bodyHeavy,
    fontSize: typography.size.md,
  },
  body: {
    color: palette.muted,
    fontFamily: typefaces.body,
    fontSize: typography.size.sm,
    lineHeight: typography.line.md,
  },
});
