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
import { isFinancialConflict } from "@/src/services/stage6Sync";
import { useAppData } from "@/src/state/AppDataProvider";

export function ConflictCenterScreen() {
  const data = useAppData();
  const conflicts = data.syncConflicts.filter(
    (conflict) => conflict.status === "unresolved",
  );

  return (
    <Screen>
      <PageHeader
        eyebrow="Sync review"
        title="Conflict center"
      />
      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Manual resolution</Text>
            <Text style={styles.heroTitle}>
              Compare local and remote records before any conflicting financial
              state is accepted.
            </Text>
            <Text style={styles.body}>
              Debtulator preserves both snapshots and the chosen decision path,
              so sync review stays explainable and auditable.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={128} height={100} />
          </View>
        </View>
      </Card>
      <Card tone={conflicts.length ? "amber" : "lavender"}>
        <SectionTitle
          title={`${conflicts.length} unresolved`}
          subtitle="Review local and remote versions before choosing a resolution."
        />
        <Text style={styles.body}>
          Financial conflicts keep the local snapshot, remote snapshot, and
          chosen resolution in audit history.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Open conflicts" />
        {conflicts.length ? (
          conflicts.map((conflict) => (
            <View key={conflict.id} style={styles.row}>
              <View style={styles.badgeLine}>
                <Badge
                  label={conflict.entityType.replaceAll("_", " ")}
                  tone="blue"
                />
                <Badge
                  label={conflict.conflictType.replaceAll("_", " ")}
                  tone={isFinancialConflict(conflict) ? "negative" : "amber"}
                />
              </View>
              <Text style={styles.title}>{conflict.localEntityId}</Text>
              <Text style={styles.meta}>
                Detected {new Date(conflict.detectedAt).toLocaleString()}
              </Text>
              <Button
                title="Review"
                icon="chevron-forward"
                variant="secondary"
                onPress={() => router.push(`/conflict/${conflict.id}` as never)}
              />
            </View>
          ))
        ) : (
          <EmptyState
            title="No conflicts"
            body="Queued edits will appear here if remote records changed first."
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
    top: -24,
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
  body: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lgPlus,
    fontFamily: typefaces.body,
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
  meta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
});
