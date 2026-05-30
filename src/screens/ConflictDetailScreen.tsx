import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

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
import { getConflictResolutionAvailability } from "@/src/data/conflictResolution";
import { isFinancialConflict } from "@/src/services/stage6Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { ConflictResolution } from "@/src/types/models";

export function ConflictDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const conflict = data.syncConflicts.find((item) => item.id === id);

  if (!conflict) {
    return (
      <Screen>
        <EmptyState
          title="Conflict not found"
          body="It may already have been resolved."
        />
      </Screen>
    );
  }

  const currentConflict = conflict;
  const financial = isFinancialConflict(currentConflict);
  const availability = getConflictResolutionAvailability(currentConflict, data);

  function resolve(resolution: ConflictResolution) {
    const action = () =>
      data
        .resolveSyncConflict(
          currentConflict.id,
          resolution,
          auth.identity.authenticatedUserId,
        )
        .then(() => router.back())
        .catch((error: unknown) => {
          Alert.alert(
            "Resolution not applied",
            error instanceof Error
              ? error.message
              : "This resolution is not supported for the current conflict.",
          );
        });
    if (
      financial &&
      ["keep_mine", "merge", "manual_edit"].includes(resolution)
    ) {
      Alert.alert(
        "Financial history warning",
        "This conflict affects balances or verified history. The chosen resolution is audited and may require re-verification.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", style: "destructive", onPress: action },
        ],
      );
      return;
    }
    action();
  }

  function confirmCancelLocalChange() {
    Alert.alert(
      "Cancel local change?",
      "This discards the queued local change for this conflict and keeps the remote version.",
      [
        { text: "Keep reviewing", style: "cancel" },
        {
          text: "Cancel local",
          style: "destructive",
          onPress: () => resolve("cancel_local_change"),
        },
      ],
    );
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Conflict review"
        title={currentConflict.entityType.replaceAll("_", " ")}
        subtitle={currentConflict.conflictType.replaceAll("_", " ")}
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Conflict comparison</Text>
            <Text style={styles.heroTitle}>
              Review both snapshots before choosing the resolution that should
              become ledger truth.
            </Text>
            <Text style={styles.body}>
              Financial conflicts are auditable because local state, remote
              state, and the final decision remain preserved together.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={128} height={100} />
          </View>
        </View>
      </Card>

      <Card tone={financial ? "amber" : "blue"}>
        <View style={styles.badgeLine}>
          <Badge
            label={financial ? "financial impact" : "non-financial"}
            tone={financial ? "negative" : "blue"}
          />
          <Badge
            label={currentConflict.status}
            tone={currentConflict.status === "unresolved" ? "amber" : "neutral"}
          />
        </View>
        <Text style={styles.body}>
          Compare the local draft against the remote version. Keep mine replays
          the local change if permission still allows it; keep theirs discards
          the queued local change while preserving this snapshot.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Local changes" />
        <Text style={styles.code}>
          {JSON.stringify(currentConflict.localSnapshot, null, 2)}
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Remote changes" />
        <Text style={styles.code}>
          {JSON.stringify(currentConflict.remoteSnapshot, null, 2)}
        </Text>
      </Card>

      <Card>
        <SectionTitle
          title="Resolution"
          subtitle="Financial fields require explicit review."
        />
        <View style={styles.actions}>
          {availability.keep_mine ? (
            <Button
              title="Keep mine"
              icon="cloud-upload"
              onPress={() => resolve("keep_mine")}
            />
          ) : null}
          {availability.keep_theirs ? (
            <Button
              title="Keep theirs"
              icon="cloud-download"
              variant="secondary"
              onPress={() => resolve("keep_theirs")}
            />
          ) : null}
          {availability.cancel_local_change ? (
            <Button
              title="Cancel local"
              icon="close"
              variant="ghost"
              onPress={confirmCancelLocalChange}
            />
          ) : null}
          {Object.values(availability).some(Boolean) ? null : (
            <Text style={styles.body}>
              This conflict cannot be resolved automatically from the stored
              snapshots. Resolve the related record manually, then retry sync.
            </Text>
          )}
        </View>
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
  code: {
    color: palette.ink,
    fontFamily: "Courier",
    fontSize: typography.size.sm,
    lineHeight: typography.line.basePlus,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});
