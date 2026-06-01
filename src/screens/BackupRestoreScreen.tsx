import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import { DebtulatorShieldIllustration } from "@/src/components/illustrations/DebtulatorShieldIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    PageHeader,
    Screen,
    SectionTitle,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import {
    buildBackup,
    previewRestore,
    restoreModeDescription,
    shareBackupFile,
} from "@/src/services/backupRestore";
import {
  addTelemetryBreadcrumb,
  captureTelemetryException,
  trackFirstSuccess,
  trackTelemetryEvent,
} from "@/src/services/telemetry";
import { useAppData } from "@/src/state/AppDataProvider";
import type { BackupMode } from "@/src/types/models";

export function BackupRestoreScreen() {
  const data = useAppData();
  const [includeAttachments, setIncludeAttachments] = useState(
    data.settings.backupIncludeAttachments,
  );
  const [includePrivateNotes, setIncludePrivateNotes] = useState(
    data.settings.backupIncludePrivateNotes,
  );
  const [restoreJson, setRestoreJson] = useState("");
  const [restoreMode, setRestoreMode] = useState<BackupMode>("merge");
  const [restoring, setRestoring] = useState(false);
  const preview = useMemo(
    () => (restoreJson.trim() ? previewRestore(restoreJson) : null),
    [restoreJson],
  );

  async function createBackup() {
    try {
      const backup = buildBackup(data, {
        includeAttachments,
        includePrivateNotes,
      });
      await shareBackupFile(backup);
      await data.updateSettings({
        backupIncludeAttachments: includeAttachments,
        backupIncludePrivateNotes: includePrivateNotes,
        lastBackupAt: backup.exportedAt,
      });
      await data.createAuditLog({
        actorUserId: null,
        action: "backup_exported",
        targetType: "backup",
        targetId: null,
        eventId: null,
        metadata: { includeAttachments, includePrivateNotes },
      });
      addTelemetryBreadcrumb("backup", "audit_logged", { result: "success" });
      trackTelemetryEvent("backup_audit_logged", { result: "success" });
    } catch (error) {
      addTelemetryBreadcrumb("backup", "create_failed", { result: "failure" });
      captureTelemetryException(error, "backup_create", {});
      Alert.alert(
        "Backup failed",
        error instanceof Error ? error.message : "Backup export failed due to an unexpected error.",
      );
    }
  }

  function confirmRestore() {
    if (!preview?.valid) {
      Alert.alert(
        "Invalid backup",
        "Paste a valid Debtulator backup JSON before restoring.",
      );
      return;
    }
    Alert.alert(
      "Restore backup?",
      `${restoreModeDescription(restoreMode)} Restored synced records default to private/local unless explicitly re-shared.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: restoreMode === "replace_local" ? "destructive" : "default",
          onPress: () => {
            addTelemetryBreadcrumb("restore", "decision_recorded", {
              mode: restoreMode,
              valid: preview.valid,
            });
            trackTelemetryEvent("restore_decision_recorded", {
              mode: restoreMode,
              valid: preview.valid,
            });
            void performRestore();
          },
        },
      ],
    );
  }

  async function performRestore() {
    try {
      setRestoring(true);
      const result = await data.restoreBackup(restoreJson, restoreMode);
      Alert.alert(
        "Restore complete",
        `${result.restored.members} members, ${result.restored.debts} debts, ${result.restored.events} events, ${result.restored.payments} payments, and ${result.restored.settlements} settlements restored. ${result.skipped} records skipped.`,
      );
      trackFirstSuccess("restore", { mode: restoreMode, result: "success" });
      setRestoreJson("");
    } catch (error) {
      Alert.alert(
        "Restore failed",
        error instanceof Error ? error.message : "Unable to restore this backup.",
      );
      captureTelemetryException(error, "restore_apply", { mode: restoreMode });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Data safety"
        title="Backup and restore"
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.switchText}>
            <Text style={styles.heroLabel}>Resilient copies</Text>
            <Text style={styles.heroTitle}>
              Protect the ledger without sacrificing privacy defaults.
            </Text>
            <Text style={styles.body}>
              Create manual JSON snapshots, preview restore impact, and keep
              restored data private unless you explicitly re-share it.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={132} height={104} />
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Create backup"
          subtitle="Manual JSON backup for this device ledger."
        />
        <ToggleRow
          title="Include attachment metadata"
          body="Attachment files are included only when practical; remote paths are not reused."
          value={includeAttachments}
          onValueChange={setIncludeAttachments}
        />
        <ToggleRow
          title="Include private notes/comments"
          body="Off by default to avoid exporting private context accidentally."
          value={includePrivateNotes}
          onValueChange={setIncludePrivateNotes}
        />
        <View style={styles.badgeLine}>
          <Badge
            label={
              data.settings.syncPrivateLocalDataToAccountBackup
                ? "account backup opt-in"
                : "local export only"
            }
            tone="blue"
          />
          <Badge
            label={
              data.settings.lastBackupAt
                ? `last ${data.settings.lastBackupAt.slice(0, 10)}`
                : "no backup yet"
            }
            tone="neutral"
          />
        </View>
        <Button title="Create backup" icon="download" onPress={createBackup} />
      </Card>

      <Card>
        <SectionTitle
          title="Restore preview"
          subtitle="Paste backup JSON to validate before choosing a restore mode."
        />
        <TextField
          label="Backup JSON"
          value={restoreJson}
          onChangeText={setRestoreJson}
          multiline
        />
        <SelectChips
          label="Restore mode"
          value={restoreMode}
          onChange={setRestoreMode}
          options={[
            { label: "Merge", value: "merge" },
            { label: "Replace local", value: "replace_local" },
            { label: "Duplicate/private", value: "duplicate_private" },
          ]}
        />
        {preview ? (
          <View style={styles.preview}>
            <Badge
              label={preview.valid ? "valid backup" : "invalid"}
              tone={preview.valid ? "positive" : "negative"}
            />
            <Text style={styles.body}>
              {preview.memberCount} members · {preview.debtCount} debts ·{" "}
              {preview.eventCount} events · {preview.paymentCount} payments ·{" "}
              {preview.settlementCount} settlements
            </Text>
            {preview.warnings.map((warning) => (
              <Text key={warning} style={styles.warning}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}
        <Button
          title={restoring ? "Restoring..." : "Restore backup"}
          icon="refresh"
          variant="secondary"
          disabled={restoring}
          onPress={confirmRestore}
        />
      </Card>
    </Screen>
  );
}

function ToggleRow({
  title,
  body,
  value,
  onValueChange,
}: {
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityHint={body}
        accessibilityState={{ checked: value }}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.lineStrong, true: palette.brandSoft }}
        thumbColor={value ? palette.brand : "#FFFFFF"}
      />
    </View>
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
    width: 142,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "space-between",
  },
  switchText: {
    flex: 1,
    gap: spacing.xs,
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
  warning: {
    color: palette.negative,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  preview: {
    gap: spacing.sm,
  },
});
