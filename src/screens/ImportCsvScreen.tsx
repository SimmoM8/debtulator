import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
    TextField,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { previewCsvImport, type ImportPreviewRow } from "@/src/services/csv";
import { fileNameFromUri, isSupportedCsvFile } from "@/src/services/attachments";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { todayIsoDate } from "@/src/utils/id";

export function ImportCsvScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [sourceName, setSourceName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const previewRows = useMemo(
    () => previewCsvImport(csvText, data.members),
    [csvText, data.members],
  );
  const validRows = previewRows.filter((row) => row.valid);
  const errorCount = previewRows.reduce(
    (total, row) => total + row.errors.length,
    0,
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function pickCsvFile() {
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv"],
        copyToCacheDirectory: true,
      });
      if (selection.canceled) {
        return;
      }
      const asset = selection.assets[0];
      if (!asset) {
        Alert.alert("Could not read CSV", "No file was selected. Please pick a CSV file and try again.");
        return;
      }
      if (!isSupportedCsvFile({ fileName: asset.name, mimeType: asset.mimeType })) {
        Alert.alert("Unsupported file type", "Please choose a .csv file.");
        return;
      }
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (!info.exists) {
        Alert.alert("File unavailable", "The selected file is no longer available. Please pick it again.");
        return;
      }
      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setCsvText(text);
      setSourceName(asset.name || fileNameFromUri(asset.uri, "CSV file"));
    } catch {
      Alert.alert(
        "Could not read CSV",
        "The selected file could not be opened. Try another CSV file or paste CSV text directly.",
      );
    }
  }

  async function confirmImport() {
    if (!validRows.length) {
      return;
    }
    setImporting(true);
    try {
      const memberByName = new Map(
        data.members.map((member) => [
          member.displayName.trim().toLowerCase(),
          member,
        ]),
      );
      let importedMembers = 0;
      let importedDebts = 0;

      for (const row of validRows) {
        if (row.kind === "member") {
          const displayName = row.normalized.displayName;
          if (!displayName || memberByName.has(displayName.toLowerCase())) {
            continue;
          }
          const member = await data.createMember({
            displayName,
            email: row.normalized.email,
            phone: row.normalized.phone,
            notes: row.normalized.notes,
            tags: row.normalized.tags,
          });
          memberByName.set(member.displayName.toLowerCase(), member);
          importedMembers += 1;
        }
      }

      for (const row of validRows) {
        if (row.kind !== "debt") {
          continue;
        }
        const normalized = row.normalized;
        const memberName = normalized.memberName;
        if (
          !memberName ||
          !normalized.title ||
          !normalized.amount ||
          !normalized.currency ||
          !normalized.direction
        ) {
          continue;
        }
        let member = memberByName.get(memberName.toLowerCase());
        if (!member) {
          member = await data.createMember({ displayName: memberName });
          memberByName.set(member.displayName.toLowerCase(), member);
          importedMembers += 1;
        }
        await data.createDebt({
          memberId: member.id,
          direction: normalized.direction,
          amount: normalized.amount,
          currency: normalized.currency,
          title: normalized.title,
          notes: normalized.notes,
          debtDate: normalized.date || todayIsoDate(),
          dueDate: normalized.dueDate,
          tags: normalized.tags,
          status: normalized.status,
          verificationStatus: "local_only",
          visibility: "private",
        });
        importedDebts += 1;
      }

      await data.createCsvImportBatch({
        userId: auth.identity.authenticatedUserId,
        sourceName: sourceName || null,
        rowCount: previewRows.length,
        importedMemberCount: importedMembers,
        importedDebtCount: importedDebts,
        errorCount,
        metadata: {
          warnings: previewRows.flatMap((row) => row.warnings),
        },
      });
      Alert.alert(
        "Import complete",
        `${importedMembers} members and ${importedDebts} debts imported as private local records.`,
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="CSV import"
        title="Import CSV"
        subtitle="Preview, validate, and confirm before saving members or simple debts."
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Import safely</Text>
            <Text style={styles.heroTitle}>
              Preview rows, count errors, and only persist the records that pass
              validation.
            </Text>
            <Text style={styles.body}>
              CSV imports create private local members and debts first, so
              nothing becomes shared or verified without later review.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="lavender">
        <SectionTitle
          title="Choose CSV"
          subtitle="Pick a CSV file from your device, or paste CSV content directly."
        />
        <TextField
          label="Source name"
          value={sourceName}
          onChangeText={setSourceName}
          placeholder="debts.csv"
        />
        <Button
          title="Choose CSV file"
          icon="cloud-upload"
          variant="secondary"
          onPress={pickCsvFile}
        />
        <TextField
          label="CSV text"
          value={csvText}
          onChangeText={setCsvText}
          placeholder="display_name,email&#10;Daniel,daniel@example.com"
          multiline
        />
      </Card>

      <Card tone={errorCount ? "amber" : "peach"}>
        <SectionTitle
          title="Preview"
          subtitle="Invalid rows can be fixed in the CSV text or skipped by importing valid rows only."
        />
        <View style={styles.badgeLine}>
          <Badge label={`${previewRows.length} rows`} tone="blue" />
          <Badge label={`${validRows.length} valid`} tone="positive" />
          <Badge
            label={`${errorCount} errors`}
            tone={errorCount ? "negative" : "neutral"}
          />
        </View>
        {previewRows.length ? (
          previewRows
            .slice(0, 30)
            .map((row) => <PreviewRow key={row.index} row={row} />)
        ) : (
          <EmptyState
            title="No rows parsed"
            body="Paste CSV text or choose a CSV file to preview the import."
          />
        )}
        <Button
          title={importing ? "Importing..." : "Confirm import"}
          icon="checkmark"
          onPress={confirmImport}
          disabled={!validRows.length || importing}
        />
      </Card>
    </Screen>
  );
}

function PreviewRow({ row }: { row: ImportPreviewRow }) {
  return (
    <View style={styles.previewRow}>
      <View style={styles.badgeLine}>
        <Badge
          label={`Row ${row.index + 2}`}
          tone={row.valid ? "positive" : "negative"}
        />
        <Badge label={row.kind} tone="blue" />
      </View>
      <Text style={styles.rowTitle}>
        {row.kind === "member"
          ? row.normalized.displayName || "Missing member name"
          : `${row.normalized.title || "Missing title"} · ${row.normalized.memberName || "Missing member"}`}
      </Text>
      {row.warnings.map((warning) => (
        <Text key={warning} style={styles.warningText}>
          {warning}
        </Text>
      ))}
      {row.errors.map((error) => (
        <Text key={error} style={styles.errorText}>
          {error}
        </Text>
      ))}
    </View>
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
    width: 142,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  previewRow: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  warningText: {
    color: palette.amber,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  errorText: {
    color: palette.negative,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
});
