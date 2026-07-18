import { Button, Section, Text, Toggle } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import { DebtulatorIllustratedHeader } from "@/src/components/ios/DebtulatorIllustration";
import { NativeEmptyState } from "@/src/components/ios/NativeEmptyState";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import {
  NativeBodyCopy,
  NativeInfoRow,
  NativeNavigationRow,
  NativeStatusText,
} from "@/src/components/ios/NativeRows";
import { entryDirectionText } from "@/src/services/ledger";
import { canRetrySyncEntry } from "@/src/services/stage6Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import type { DebtVisibility, GroupVisibility } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

function openLedgerEntry(entry: ReturnType<typeof useAppData>["ledgerEntries"][number]) {
  if (entry.kind === "simple_debt") {
    router.push(`/(tabs)/debts/debt/${entry.sourceId}` as never);
  } else if (entry.kind === "expense_obligation") {
    router.push(`/(tabs)/groups/expense/${entry.expenseId ?? entry.sourceId}` as never);
  } else {
    router.push(`/(tabs)/groups/group/${entry.groupId}?focusDebt=${entry.sourceId}` as never);
  }
}

export function NativeDebtHistoryScreen() {
  const data = useAppData();
  const history = useMemo(
    () => data.ledgerEntries
      .filter((entry) => entry.status !== "archived" && (entry.remainingAmount <= 0.005 || entry.status === "settled" || entry.paymentStatus === "paid"))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [data.ledgerEntries],
  );
  return (
    <>
      <Stack.Title>Settled Debts</Stack.Title>
      <NativeListScreen onRefresh={data.refresh}>
        <Section title={`${history.length} closed`}>
          {history.length ? history.map((entry) => (
            <NativeNavigationRow
              key={entry.id}
              title={entry.title}
              subtitle={`${entryDirectionText(entry, data.members, data.sharedGroupMembers)} · ${new Date(entry.date).toLocaleDateString()}`}
              value={formatMoney(entry.originalAmount, entry.currency)}
              systemImage={entry.groupId ? "person.3" : "wallet.bifold"}
              onPress={() => openLedgerEntry(entry)}
            />
          )) : <NativeEmptyState title="No settled debts" description="Paid and manually settled records will appear here." systemImage="checkmark.circle" />}
        </Section>
      </NativeListScreen>
    </>
  );
}

export function NativeRecurringTemplatesScreen() {
  const data = useAppData();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  async function generate() {
    try {
      setGenerating(true);
      const ids = await data.generateDueRecurringRecords();
      setStatus(ids.length ? `${ids.length} records created.` : "Nothing is due today.");
    } finally {
      setGenerating(false);
    }
  }
  return (
    <>
      <Stack.Title>Recurring Records</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add recurring record" onPress={() => router.push("/(tabs)/settings/recurring/form" as never)} />
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section title="Automation" footer={<Text>Due templates can also be generated when the app opens, according to your preference.</Text>}>
          <Button label={generating ? "Generating…" : "Generate Due Records"} systemImage="bolt" onPress={() => void generate()} modifiers={[buttonStyle("bordered")]} />
          {status ? <NativeStatusText>{status}</NativeStatusText> : null}
        </Section>
        <Section title="Templates">
          {data.recurringTemplates.length ? data.recurringTemplates.map((template) => (
            <NativeNavigationRow
              key={template.id}
              title={template.title}
              subtitle={`${template.type.replaceAll("_", " ")} · ${template.status} · next ${template.nextOccurrenceDate}`}
              value={formatMoney(template.amount, template.currency)}
              systemImage="repeat"
              onPress={() => router.push({ pathname: "/(tabs)/settings/recurring/form", params: { id: template.id } } as never)}
            />
          )) : <NativeEmptyState title="No recurring records" description="Create a recurring debt or shared expense template." systemImage="repeat" />}
        </Section>
      </NativeListScreen>
    </>
  );
}

export function NativeConflictCenterScreen() {
  const data = useAppData();
  const conflicts = data.syncConflicts.filter((item) => item.status === "unresolved");
  return (
    <>
      <Stack.Title>Conflict Center</Stack.Title>
      <NativeListScreen onRefresh={data.refresh}>
        <Section footer={<Text>Both snapshots are preserved until you choose a resolution.</Text>}>
          <NativeInfoRow label="Unresolved" value={String(conflicts.length)} systemImage="exclamationmark.triangle" />
        </Section>
        <Section title="Open conflicts">
          {conflicts.length ? conflicts.map((conflict) => (
            <NativeNavigationRow
              key={conflict.id}
              title={conflict.entityType.replaceAll("_", " ")}
              subtitle={`${conflict.conflictType.replaceAll("_", " ")} · ${new Date(conflict.detectedAt).toLocaleString()}`}
              systemImage="arrow.triangle.branch"
              onPress={() => router.push(`/(tabs)/settings/conflict/${conflict.id}` as never)}
            />
          )) : <NativeEmptyState title="No conflicts" description="Conflicting remote edits will appear here for review." systemImage="checkmark.shield" />}
        </Section>
      </NativeListScreen>
    </>
  );
}

export function NativeSyncStatusScreen() {
  const data = useAppData();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const pending = data.syncQueue.filter((entry) => ["pending", "running", "failed", "conflict"].includes(entry.status));
  return (
    <>
      <Stack.Title>Sync Status</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="exclamationmark.arrow.triangle.2.circlepath" accessibilityLabel="Review conflicts" onPress={() => router.push("/(tabs)/settings/conflicts" as never)} />
      </Stack.Toolbar>
      <NativeListScreen onRefresh={data.refresh}>
        <Section title="Health">
          <NativeInfoRow label="Status" value={data.syncSummary.statusLabel} systemImage="arrow.triangle.2.circlepath" />
          <NativeInfoRow label="Pending" value={String(data.syncSummary.pendingCount)} />
          <NativeInfoRow label="Conflicts" value={String(data.syncSummary.conflictCount)} />
          <NativeInfoRow label="Failed" value={String(data.syncSummary.failedCount)} />
          <NativeInfoRow label="Local only" value={String(data.syncSummary.localOnlyCount)} />
        </Section>
        <Section title="Queue" footer={<Text>Private local-only records are not sync work unless account backup is enabled.</Text>}>
          {pending.length ? pending.map((entry) => (
            <Section key={entry.id}>
              <NativeInfoRow label={`${entry.operation.replaceAll("_", " ")} ${entry.entityType.replaceAll("_", " ")}`} value={entry.status} />
              {entry.errorMessage ? <NativeStatusText destructive>{entry.errorMessage}</NativeStatusText> : null}
              {entry.status === "failed" && canRetrySyncEntry(entry) ? (
                <Button label="Retry" systemImage="arrow.clockwise" onPress={() => void data.updateSyncQueueEntry(entry.id, { status: "pending", errorCode: null, errorMessage: null })} />
              ) : null}
              {["failed", "conflict"].includes(entry.status) ? <Button label="Cancel Sync Work" role="destructive" onPress={() => setCancelId(entry.id)} /> : null}
            </Section>
          )) : <NativeEmptyState title="No pending sync work" description="The sync queue is clear." systemImage="checkmark.circle" />}
        </Section>
        <NativeConfirmationDialog title="Cancel sync work?" message="This queue item will not retry automatically." actionLabel="Cancel Work" destructive isPresented={Boolean(cancelId)} onPresentedChange={(presented) => { if (!presented) setCancelId(null); }} onConfirm={() => { if (cancelId) void data.updateSyncQueueEntry(cancelId, { status: "cancelled" }); }} />
      </NativeListScreen>
    </>
  );
}

export function NativePrivacyScreen() {
  const data = useAppData();
  const settings = data.settings;
  return (
    <>
      <Stack.Title>Privacy</Stack.Title>
      <NativeListScreen>
        <Section>
          <DebtulatorIllustratedHeader
            variant="shield"
            title="Private by default"
            description="You decide what is shared, synced and visible in Debtulator."
          />
        </Section>
        <Section title="Defaults" footer={<Text>New records remain private unless you explicitly share them.</Text>}>
          <NativePrivacyChoice<DebtVisibility> label="Debt visibility" value={settings.defaultDebtVisibility} options={[{ label: "Private", value: "private" }, { label: "Shared with member", value: "shared_with_involved_member" }]} onChange={(defaultDebtVisibility) => void data.updateSettings({ defaultDebtVisibility })} />
          <NativePrivacyChoice<GroupVisibility> label="Group visibility" value={settings.defaultGroupVisibility} options={[{ label: "Private", value: "private" }, { label: "Shared", value: "shared" }]} onChange={(defaultGroupVisibility) => void data.updateSettings({ defaultGroupVisibility })} />
        </Section>
        <Section title="Data handling">
          <Toggle label="Show sensitive notification details" isOn={settings.showSensitiveDetailsInNotifications} onIsOnChange={(value) => void data.updateSettings({ showSensitiveDetailsInNotifications: value })} />
          <Toggle label="Back up private local data" isOn={settings.syncPrivateLocalDataToAccountBackup} onIsOnChange={(value) => void data.updateSettings({ syncPrivateLocalDataToAccountBackup: value })} />
          <Toggle label="Upload shared attachments" isOn={settings.uploadAttachmentsForSharedRecords} onIsOnChange={(value) => void data.updateSettings({ uploadAttachmentsForSharedRecords: value })} />
          <Toggle label="Suggestions use private data only" isOn={settings.smartSuggestionsPrivateOnly} onIsOnChange={(value) => void data.updateSettings({ smartSuggestionsPrivateOnly: value })} />
        </Section>
        <Section title="Diagnostics" footer={<Text>Private notes and attachment contents are never included in diagnostics.</Text>}>
          <Toggle label="Beta telemetry milestones" isOn={settings.betaTelemetryEnabled} onIsOnChange={(value) => void data.updateSettings({ betaTelemetryEnabled: value })} />
          <Toggle label="Crash reporting" isOn={settings.betaCrashReportingEnabled} onIsOnChange={(value) => void data.updateSettings({ betaCrashReportingEnabled: value })} />
        </Section>
      </NativeListScreen>
    </>
  );
}

function NativePrivacyChoice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { label: string; value: T }[]; onChange: (value: T) => void }) {
  return (
    <Section title={label}>
      {options.map((option) => <Toggle key={option.value} label={option.label} isOn={option.value === value} onIsOnChange={(selected) => { if (selected) onChange(option.value); }} />)}
    </Section>
  );
}

export function NativeLanguageScreen() {
  const data = useAppData();
  const choices = [
    { label: "System", value: "system" as const },
    { label: "English", value: "en" as const },
    { label: "Svenska", value: "sv" as const },
  ];
  return (
    <>
      <Stack.Title>Language</Stack.Title>
      <NativeListScreen>
        <Section title="App language" footer={<Text>Money and dates follow the selected locale without changing ledger values.</Text>}>
          {choices.map((choice) => <Toggle key={choice.value} label={choice.label} isOn={data.settings.language === choice.value} onIsOnChange={(selected) => { if (selected) void data.updateSettings({ language: choice.value }); }} />)}
        </Section>
        <Section title="Preview">
          <NativeInfoRow label="Amount" value={new Intl.NumberFormat(data.settings.language === "sv" ? "sv-SE" : undefined, { style: "currency", currency: data.settings.baseCurrency }).format(1200)} />
          <NativeInfoRow label="Date" value={new Intl.DateTimeFormat(data.settings.language === "sv" ? "sv-SE" : undefined, { dateStyle: "long" }).format(new Date())} />
        </Section>
      </NativeListScreen>
    </>
  );
}

export function NativeAccessibilityScreen() {
  const checks = [
    "System controls expose native VoiceOver roles and values.",
    "Financial statuses use text in addition to color.",
    "System text styles scale with Dynamic Type.",
    "Destructive actions require explicit confirmation.",
    "Sync and conflict states remain readable without color.",
  ];
  return (
    <>
      <Stack.Title>Accessibility & Help</Stack.Title>
      <NativeListScreen>
        <Section title="Accessibility">
          {checks.map((check) => <NativeInfoRow key={check} label={check} value="Supported" systemImage="checkmark.circle" />)}
        </Section>
        <Section title="Support">
          <NativeBodyCopy>When asking for help, include the screen, the action attempted, whether the device was offline, and the sync status. Never include passwords or private notes.</NativeBodyCopy>
        </Section>
        <Section title="About">
          <NativeInfoRow label="App" value="Debtulator" />
          <NativeInfoRow label="Presentation" value="Native iOS" />
        </Section>
      </NativeListScreen>
    </>
  );
}
