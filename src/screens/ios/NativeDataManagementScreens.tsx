import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Button, Section, Text, Toggle } from "@expo/ui/swift-ui";
import { buttonStyle, disabled } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
import { Share } from "react-native";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import {
  NativePicker,
  NativeTextField,
} from "@/src/components/ios/NativeFormControls";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import {
  NativeBodyCopy,
  NativeInfoRow,
  NativeNavigationRow,
  NativeStatusText,
} from "@/src/components/ios/NativeRows";
import {
  buildBackup,
  previewRestore,
  restoreModeDescription,
  shareBackupFile,
} from "@/src/services/backupRestore";
import {
  debtsToCsv,
  groupsToCsv,
  membersToCsv,
  paymentsToCsv,
  previewCsvImport,
  recurringTemplatesToCsv,
  settlementsToCsv,
  tagsToCsv,
} from "@/src/services/csv";
import {
  sanitizeAttachmentsForPortableExport,
  shareExport,
  writeTextExport,
} from "@/src/services/export";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { BackupMode } from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";

type ExportScope = "debts" | "members" | "groups" | "payments" | "settlements" | "recurring" | "tags";

export function NativeBackupScreen() {
  const data = useAppData();
  const [includeAttachments, setIncludeAttachments] = useState(data.settings.backupIncludeAttachments);
  const [includePrivateNotes, setIncludePrivateNotes] = useState(data.settings.backupIncludePrivateNotes);
  const [restoreJson, setRestoreJson] = useState("");
  const [restoreMode, setRestoreMode] = useState<BackupMode>("merge");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [restorePresented, setRestorePresented] = useState(false);
  const preview = useMemo(() => restoreJson.trim() ? previewRestore(restoreJson) : null, [restoreJson]);

  async function createBackup() {
    try {
      setWorking(true);
      setMessage(null);
      const backup = buildBackup(data, { includeAttachments, includePrivateNotes });
      await shareBackupFile(backup);
      await data.updateSettings({
        backupIncludeAttachments: includeAttachments,
        backupIncludePrivateNotes: includePrivateNotes,
        lastBackupAt: backup.exportedAt,
      });
      await data.createAuditLog({ actorUserId: null, action: "backup_exported", targetType: "backup", targetId: null, groupId: null, metadata: { includeAttachments, includePrivateNotes } });
      setMessage("Backup created and opened in the system share sheet.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The backup could not be created.");
    } finally {
      setWorking(false);
    }
  }

  async function restore() {
    try {
      setWorking(true);
      const result = await data.restoreBackup(restoreJson, restoreMode);
      setMessage(`${result.restored.members} members, ${result.restored.debts} debts, ${result.restored.groups} groups, ${result.restored.payments} payments and ${result.restored.settlements} settlements restored. ${result.skipped} skipped.`);
      setRestoreJson("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The backup could not be restored.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <Stack.Title>Backup & Restore</Stack.Title>
      <NativeListScreen>
        <Section title="Create backup" footer={<Text>A manual JSON snapshot stays under your control.</Text>}>
          <Toggle label="Include attachment metadata" isOn={includeAttachments} onIsOnChange={setIncludeAttachments} />
          <Toggle label="Include private notes and comments" isOn={includePrivateNotes} onIsOnChange={setIncludePrivateNotes} />
          <Button label={working ? "Working…" : "Create and Share Backup"} systemImage="square.and.arrow.up" onPress={() => void createBackup()} modifiers={[buttonStyle("borderedProminent"), disabled(working)]} />
          {data.settings.lastBackupAt ? <NativeInfoRow label="Last backup" value={new Date(data.settings.lastBackupAt).toLocaleString()} /> : null}
        </Section>
        <Section title="Restore" footer={<Text>{restoreModeDescription(restoreMode)} Restored shared records remain private until explicitly shared again.</Text>}>
          <NativePicker label="Restore mode" value={restoreMode} options={[{ label: "Merge", value: "merge" }, { label: "Replace local", value: "replace_local" }, { label: "Duplicate privately", value: "duplicate_private" }]} onChange={setRestoreMode} />
          <NativeTextField label="Paste backup JSON" value={restoreJson} onChange={setRestoreJson} multiline submit="done" />
          {preview ? <NativeInfoRow label="Preview" value={preview.valid ? "Valid backup" : "Invalid backup"} /> : null}
          <Button label="Restore Backup" role={restoreMode === "replace_local" ? "destructive" : "default"} onPress={() => setRestorePresented(true)} modifiers={[disabled(!preview?.valid || working)]} />
          {message ? <NativeStatusText destructive={message.toLocaleLowerCase().includes("could not")}>{message}</NativeStatusText> : null}
        </Section>
        <NativeConfirmationDialog title="Restore this backup?" message={`${restoreModeDescription(restoreMode)} This operation changes local ledger data.`} actionLabel="Restore" destructive={restoreMode === "replace_local"} isPresented={restorePresented} onPresentedChange={setRestorePresented} onConfirm={() => void restore()} />
      </NativeListScreen>
    </>
  );
}
export function NativeExportScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [scope, setScope] = useState<ExportScope>("debts");
  const [includeNotes, setIncludeNotes] = useState(data.settings.includePrivateNotesInExports);
  const [includeRejected, setIncludeRejected] = useState(data.settings.includeRejectedDisputedInExports);
  const [includeArchived, setIncludeArchived] = useState(data.settings.includeArchivedInExports);
  const [message, setMessage] = useState<string | null>(null);

  function csvForScope() {
    const options = { includeNotes, includeArchived, includeRejectedDisputed: includeRejected };
    switch (scope) {
      case "members": return membersToCsv(data.members, options);
      case "groups": return groupsToCsv(data.groups, options);
      case "payments": return paymentsToCsv(data.payments, options);
      case "settlements": return settlementsToCsv(data.settlements, options);
      case "recurring": return recurringTemplatesToCsv(data.recurringTemplates);
      case "tags": return tagsToCsv(data.tags);
      default: return debtsToCsv(data.ledgerEntries, options);
    }
  }

  async function exportCsv() {
    try {
      setMessage(null);
      const uri = await writeTextExport(`debtulator-${scope}-${Date.now()}.csv`, csvForScope());
      await data.createExportLog({ userId: auth.identity.authenticatedUserId, exportType: "csv", targetType: scope === "members" ? "member" : scope === "groups" ? "group" : "ledger", metadata: { scope, includeNotes, includeRejected, includeArchived, uri } });
      await data.updateSettings({ includePrivateNotesInExports: includeNotes, includeRejectedDisputedInExports: includeRejected, includeArchivedInExports: includeArchived });
      await shareExport(uri, `Debtulator ${scope} CSV`);
      setMessage("Export opened in the system share sheet.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The export could not be created.");
    }
  }

  return (
    <>
      <Stack.Title>Import & Export</Stack.Title>
      <NativeListScreen>
        <Section title="Move data">
          <NativeNavigationRow title="Import CSV" subtitle="Preview rows before creating private local records" systemImage="square.and.arrow.down" onPress={() => router.push("/(tabs)/settings/import-csv" as never)} />
          <NativeNavigationRow title="Full Data Export" subtitle="Create a portable JSON ledger snapshot" systemImage="archivebox" onPress={() => router.push("/(tabs)/settings/full-export" as never)} />
        </Section>
        <Section title="CSV export">
          <NativePicker label="Scope" value={scope} options={[
            { label: "Debts", value: "debts" }, { label: "Members", value: "members" }, { label: "Groups", value: "groups" },
            { label: "Payments", value: "payments" }, { label: "Settlements", value: "settlements" }, { label: "Recurring", value: "recurring" }, { label: "Tags", value: "tags" },
          ]} onChange={setScope} />
          <Toggle label="Include private notes" isOn={includeNotes} onIsOnChange={setIncludeNotes} />
          <Toggle label="Include rejected and disputed" isOn={includeRejected} onIsOnChange={setIncludeRejected} />
          <Toggle label="Include archived records" isOn={includeArchived} onIsOnChange={setIncludeArchived} />
          <Button label="Generate CSV" systemImage="square.and.arrow.up" onPress={() => void exportCsv()} modifiers={[buttonStyle("borderedProminent")]} />
          {message ? <NativeStatusText>{message}</NativeStatusText> : null}
        </Section>
      </NativeListScreen>
    </>
  );
}

export function NativeFullExportScreen() {
  const data = useAppData();
  const [includeAttachments, setIncludeAttachments] = useState(data.settings.includeAttachmentsInExports);
  const [includePrivateNotes, setIncludePrivateNotes] = useState(data.settings.includePrivateNotesInExports);
  const [message, setMessage] = useState<string | null>(null);
  async function exportData() {
    try {
      const exportedAt = new Date().toISOString();
      const payload = {
        app: "Debtulator", schemaVersion: 7, exportedAt, format: "json",
        data: {
          profiles: data.profiles, settings: data.settings, members: data.members, debts: data.debts,
          expenses: data.sharedExpenses, groups: data.groups, groupMembers: data.sharedGroupMembers,
          groupParticipants: data.groupParticipants, payments: data.payments, settlements: data.settlements,
          tags: data.tags, comments: includePrivateNotes ? data.comments : data.comments.filter((comment) => comment.visibility === "shared"),
          attachments: includeAttachments ? sanitizeAttachmentsForPortableExport(data.attachments) : [],
          recurringTemplates: data.recurringTemplates, reminders: data.reminders, activityLogs: data.activityLogs,
          auditLogs: data.auditLogs, smartSuggestions: data.smartSuggestions,
        },
      };
      const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!directory) throw new Error("No writable export directory is available.");
      const uri = `${directory}debtulator-full-export-${exportedAt.slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
      await data.createExportLog({ userId: null, exportType: "text_summary", targetType: "ledger", targetId: null, metadata: { includeAttachments, includePrivateNotes, fullExport: true } });
      await data.createAuditLog({ actorUserId: null, action: "export_generated", targetType: "backup", targetId: null, groupId: null, metadata: { format: "json", includeAttachments, includePrivateNotes } });
      await data.updateSettings({ includeAttachmentsInExports: includeAttachments, includePrivateNotesInExports: includePrivateNotes });
      await Share.share({ url: uri, message: "Debtulator full data export" });
      setMessage("Full export opened in the system share sheet.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The export could not be created.");
    }
  }
  return (
    <>
      <Stack.Title>Full Data Export</Stack.Title>
      <NativeListScreen>
        <Section title="Portable JSON" footer={<Text>Shared group data is limited to records this device can access.</Text>}>
          <NativeBodyCopy>Create a complete account snapshot. Estimated currency values and permission-scoped records remain explicitly labelled.</NativeBodyCopy>
          <Toggle label="Include attachment metadata" isOn={includeAttachments} onIsOnChange={setIncludeAttachments} />
          <Toggle label="Include private notes and comments" isOn={includePrivateNotes} onIsOnChange={setIncludePrivateNotes} />
          <Button label="Generate Full Export" systemImage="square.and.arrow.up" onPress={() => void exportData()} modifiers={[buttonStyle("borderedProminent")]} />
          {message ? <NativeStatusText>{message}</NativeStatusText> : null}
        </Section>
      </NativeListScreen>
    </>
  );
}

export function NativeImportCsvScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [sourceName, setSourceName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmationPresented, setConfirmationPresented] = useState(false);
  const previewRows = useMemo(() => previewCsvImport(csvText, data.members), [csvText, data.members]);
  const validRows = previewRows.filter((row) => row.valid);
  const errorCount = previewRows.reduce((sum, row) => sum + row.errors.length, 0);

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error("Choose a CSV file no larger than 5 MB.");
      setCsvText(await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 }));
      setSourceName(asset.name || "CSV file");
      setMessage(`${asset.name || "CSV file"} loaded. Review the preview before importing.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The CSV could not be read.");
    }
  }

  async function performImport() {
    try {
      setImporting(true);
      const memberByName = new Map(data.members.map((member) => [member.displayName.trim().toLocaleLowerCase(), member]));
      let importedMembers = 0;
      let importedDebts = 0;
      for (const row of validRows.filter((row) => row.kind === "member")) {
        const name = row.normalized.displayName;
        if (!name || memberByName.has(name.toLocaleLowerCase())) continue;
        const member = await data.createMember({ displayName: name, email: row.normalized.email, phone: row.normalized.phone, notes: row.normalized.notes, tags: row.normalized.tags });
        memberByName.set(name.toLocaleLowerCase(), member);
        importedMembers += 1;
      }
      for (const row of validRows.filter((row) => row.kind === "debt")) {
        const value = row.normalized;
        if (!value.memberName || !value.title || !value.amount || !value.currency || !value.direction) continue;
        let member = memberByName.get(value.memberName.toLocaleLowerCase());
        if (!member) {
          member = await data.createMember({ displayName: value.memberName });
          memberByName.set(value.memberName.toLocaleLowerCase(), member);
          importedMembers += 1;
        }
        await data.createDebt({ memberId: member.id, direction: value.direction, amount: value.amount, currency: value.currency, title: value.title, notes: value.notes, debtDate: value.date || todayIsoDate(), dueDate: value.dueDate, tags: value.tags, status: value.status, verificationStatus: "local_only", visibility: "private" });
        importedDebts += 1;
      }
      await data.createCsvImportBatch({ userId: auth.identity.authenticatedUserId, sourceName: sourceName || null, rowCount: previewRows.length, importedMemberCount: importedMembers, importedDebtCount: importedDebts, errorCount, metadata: { warnings: previewRows.flatMap((row) => row.warnings) } });
      setMessage(`${importedMembers} members and ${importedDebts} debts imported as private local records.`);
      setCsvText("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The import could not be completed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Stack.Title>Import CSV</Stack.Title>
      <NativeListScreen>
        <Section title="Choose CSV" footer={<Text>Imports create private, local-only members and debts. Nothing is shared automatically.</Text>}>
          <Button label="Choose CSV File" systemImage="doc.badge.plus" onPress={() => void pickFile()} modifiers={[buttonStyle("bordered")]} />
          <NativeTextField label="Or paste CSV text" value={csvText} onChange={setCsvText} multiline submit="done" />
          {sourceName ? <NativeInfoRow label="Source" value={sourceName} /> : null}
        </Section>
        <Section title="Preview">
          <NativeInfoRow label="Rows" value={String(previewRows.length)} />
          <NativeInfoRow label="Valid" value={String(validRows.length)} />
          <NativeInfoRow label="Errors" value={String(errorCount)} />
          {previewRows.slice(0, 12).map((row) => <NativeInfoRow key={row.index} label={row.normalized.title ?? row.normalized.displayName ?? `Row ${row.index + 1}`} value={row.valid ? (row.warnings.length ? "Warning" : "Ready") : "Invalid"} />)}
          <Button label={importing ? "Importing…" : "Import Valid Rows"} systemImage="square.and.arrow.down" onPress={() => setConfirmationPresented(true)} modifiers={[buttonStyle("borderedProminent"), disabled(!validRows.length || importing)]} />
          {message ? <NativeStatusText>{message}</NativeStatusText> : null}
        </Section>
        <NativeConfirmationDialog title="Import valid rows?" message={`${validRows.length} valid rows will be added as private local records.`} actionLabel="Import" isPresented={confirmationPresented} onPresentedChange={setConfirmationPresented} onConfirm={() => void performImport()} />
      </NativeListScreen>
    </>
  );
}
