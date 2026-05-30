import { router } from "expo-router";
import React from "react";
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
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { canRetrySyncEntry } from "@/src/services/stage6Sync";
import { useAppData } from "@/src/state/AppDataProvider";

export function SyncStatusScreen() {
  const data = useAppData();
  const pending = data.syncQueue.filter((entry) =>
    ["pending", "running", "failed", "conflict"].includes(entry.status),
  );

  return (
    <Screen>
      <PageHeader
        eyebrow="Data safety"
        title="Sync status"
        subtitle="Offline changes are queued locally and never discarded silently."
        action={
          <Button
            title="Conflicts"
            icon="git-compare"
            variant="secondary"
            onPress={() => router.push("/conflicts" as never)}
          />
        }
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Queue health</Text>
            <Text style={styles.heroTitle}>
              See what is pending, blocked, or waiting for review before
              anything is lost.
            </Text>
            <Text style={styles.body}>
              Debtulator keeps local ordering, conflict visibility, and explicit
              retry paths instead of silently mutating financial history.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={128} height={100} />
          </View>
        </View>
      </Card>

      <Card tone={data.syncSummary.hasBlockingProblems ? "amber" : "lavender"}>
        <SectionTitle
          title={data.syncSummary.statusLabel}
          subtitle="Central sync state for local and shared records."
        />
        <View style={styles.badgeLine}>
          <Badge
            label={`${data.syncSummary.pendingCount} pending`}
            tone={data.syncSummary.pendingCount ? "amber" : "neutral"}
          />
          <Badge
            label={`${data.syncSummary.conflictCount} conflicts`}
            tone={data.syncSummary.conflictCount ? "negative" : "neutral"}
          />
          <Badge
            label={`${data.syncSummary.failedCount} failed`}
            tone={data.syncSummary.failedCount ? "negative" : "neutral"}
          />
          <Badge
            label={`${data.syncSummary.localOnlyCount} local-only`}
            tone="blue"
          />
        </View>
        <Text style={styles.body}>
          Private local-only records stay on this device unless account backup
          is explicitly enabled. Shared financial edits that cannot be checked
          safely are blocked or queued for review.
        </Text>
      </Card>

      <Card>
        <SectionTitle
          title="Pending changes"
          subtitle="Queue entries survive restart and keep dependency order."
        />
        {pending.length ? (
          pending.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.flexOne}>
                <Text style={styles.title}>
                  {entry.operation.replaceAll("_", " ")}{" "}
                  {entry.entityType.replaceAll("_", " ")}
                </Text>
                <Text style={styles.meta}>
                  {entry.status} · retries {entry.retryCount} ·{" "}
                  {entry.errorMessage ?? "waiting for sync"}
                </Text>
              </View>
              <View style={styles.actions}>
                {entry.status === "failed" && canRetrySyncEntry(entry) ? (
                  <Button
                    title="Retry"
                    icon="refresh"
                    variant="secondary"
                    onPress={() =>
                      data.updateSyncQueueEntry(entry.id, {
                        status: "pending",
                        errorCode: null,
                        errorMessage: null,
                      })
                    }
                  />
                ) : null}
                {entry.status === "failed" || entry.status === "conflict" ? (
                  <Button
                    title="Cancel"
                    icon="close"
                    variant="ghost"
                    onPress={() =>
                      data.updateSyncQueueEntry(entry.id, {
                        status: "cancelled",
                      })
                    }
                  />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No pending sync work"
            body="Local-only records remain private and are not shown as sync work."
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
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lgPlus,
    fontFamily: typefaces.body,
  },
  row: {
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  title: {
    color: palette.ink,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
  meta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    marginTop: 3,
    fontFamily: typefaces.body,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
