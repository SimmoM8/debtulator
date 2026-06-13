import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorShieldIllustration } from "@/src/components/illustrations/DebtulatorShieldIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    PageHeader,
    Screen,
    SectionTitle,
    SegmentedControl,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { useAppData } from "@/src/state/AppDataProvider";

type Filter =
  | "all"
  | "unread"
  | "groups"
  | "verification"
  | "payments"
  | "reminders";

export function NotificationCenterScreen() {
  const data = useAppData();
  const [filter, setFilter] = useState<Filter>("all");
  const notifications = useMemo(
    () =>
      data.notifications.filter((notification) => {
        if (filter === "unread") {
          return !notification.readAt;
        }
        if (filter === "groups") {
          return (
            notification.type.includes("group") ||
            notification.type === "claim_request"
          );
        }
        if (filter === "verification") {
          return notification.type.includes("verification");
        }
        if (filter === "payments") {
          return (
            notification.type === "payment" ||
            notification.type === "settlement"
          );
        }
        if (filter === "reminders") {
          return notification.type === "reminder";
        }
        return true;
      }),
    [data.notifications, filter],
  );
  const unread = data.notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  return (
    <Screen>
      <PageHeader
        eyebrow="Notifications"
        title="Notification center"
        action={
          <Button
            title="Mark all read"
            icon="checkmark-done"
            variant="secondary"
            onPress={data.markAllNotificationsRead}
            disabled={!unread}
          />
        }
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Message center</Text>
            <Text style={styles.heroTitle}>
              Keep approvals, reminders, and sync notices in one readable
              stream.
            </Text>
            <Text style={styles.body}>
              Push and email settings are saved as preferences only. Important
              state changes stay inspectable here in the app.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={128} height={100} />
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle
          title={`${unread} unread`}
          subtitle="Filters apply to the local in-app notification history."
        />
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Unread", value: "unread" },
            { label: "Groups", value: "groups" },
            { label: "Verify", value: "verification" },
            { label: "Pay", value: "payments" },
            { label: "Due", value: "reminders" },
          ]}
        />
      </Card>

      <Card>
        {notifications.length ? (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.row}>
              <View style={styles.badgeLine}>
                <Badge
                  label={notification.type.replaceAll("_", " ")}
                  tone={notification.readAt ? "neutral" : "blue"}
                />
              </View>
              <Text style={styles.title}>{notification.title}</Text>
              <Text style={styles.body}>{notification.body}</Text>
              <Text style={styles.meta}>
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
              <View style={styles.actions}>
                {!notification.readAt ? (
                  <Button
                    title="Mark read"
                    icon="checkmark"
                    variant="secondary"
                    onPress={() => data.markNotificationRead(notification.id)}
                  />
                ) : null}
                {notification.targetType === "sync_conflict" &&
                notification.targetId ? (
                  <Button
                    title="Open"
                    icon="chevron-forward"
                    onPress={() =>
                      router.push(`/conflict/${notification.targetId}` as never)
                    }
                  />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No notifications"
            body="Verification, group, payment, reminder, export, and sync notices will appear here in the app."
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -28,
    right: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.displayMedium,
  },
  heroArtWrap: {
    width: 140,
    height: 110,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  title: {
    color: palette.ink,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
  },
  meta: {
    color: palette.faint,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
