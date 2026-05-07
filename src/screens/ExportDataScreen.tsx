import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, LoadingState, PageHeader, Screen, SectionTitle, SelectChips } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import {
  debtsToCsv,
  eventsToCsv,
  membersToCsv,
  paymentsToCsv,
  recurringTemplatesToCsv,
  settlementsToCsv,
  tagsToCsv,
} from '@/src/services/csv';
import {
  eventPdfLines,
  eventTextSummary,
  shareExport,
  writePdfExport,
  writeTextExport,
  type PrivacyExportOptions,
} from '@/src/services/export';
import { explainEventSettlement } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';

type Scope = 'debts' | 'members' | 'events' | 'payments' | 'settlements' | 'recurring' | 'tags';

export function ExportDataScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [scope, setScope] = useState<Scope>('debts');
  const [includeNotes, setIncludeNotes] = useState(data.settings.includePrivateNotesInExports);
  const [includeComments, setIncludeComments] = useState(data.settings.includeCommentsInExports);
  const [includeAttachments, setIncludeAttachments] = useState(data.settings.includeAttachmentsInExports);
  const [includeRejected, setIncludeRejected] = useState(data.settings.includeRejectedDisputedInExports);
  const [includeArchived, setIncludeArchived] = useState(data.settings.includeArchivedInExports);

  if (data.loading) {
    return <LoadingState />;
  }

  const privacyOptions: PrivacyExportOptions = {
    includePrivateNotes: includeNotes,
    includeComments,
    includeAttachments,
    includeRejectedDisputed: includeRejected,
    includeArchived,
  };

  async function exportCsv() {
    const csv = csvForScope(scope);
    const uri = await writeTextExport(`debtulator-${scope}-${Date.now()}.csv`, csv);
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: 'csv',
      targetType: scope === 'members' ? 'member' : scope === 'events' ? 'event' : 'ledger',
      metadata: { scope, includeNotes, includeComments, includeAttachments, includeRejected, includeArchived, uri },
    });
    await shareExport(uri, `Debtulator ${scope} CSV`);
  }

  async function exportFirstEventPdf() {
    const event = data.events.find((item) => !item.archived) ?? data.events[0];
    if (!event) {
      Alert.alert('No event to export', 'Create an event before exporting an event PDF.');
      return;
    }
    const explanation = explainEventSettlement(event.id, data.ledgerEntries);
    const uri = await writePdfExport(
      `debtulator-${event.name}-summary.pdf`,
      eventPdfLines({
        event,
        explanation,
        snapshot: data,
        options: privacyOptions,
      }),
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: 'pdf',
      targetType: 'event',
      targetId: event.id,
      metadata: { includeNotes, includeComments, includeAttachments, includeRejected, includeArchived, uri },
    });
    await shareExport(uri, `${event.name} PDF summary`);
  }

  async function shareFirstEventText() {
    const event = data.events.find((item) => !item.archived) ?? data.events[0];
    if (!event) {
      Alert.alert('No event to share', 'Create an event before sharing a summary.');
      return;
    }
    const text = eventTextSummary({
      event,
      explanation: explainEventSettlement(event.id, data.ledgerEntries),
      snapshot: data,
      options: privacyOptions,
    });
    const uri = await writeTextExport(`debtulator-${event.name}-summary.txt`, text);
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: 'text_summary',
      targetType: 'event',
      targetId: event.id,
      metadata: { includeNotes, includeComments, includeAttachments, includeRejected, includeArchived, uri },
    });
    await shareExport(uri, `${event.name} text summary`, text);
  }

  function csvForScope(selectedScope: Scope) {
    const options = { includeNotes, includeArchived, includeRejectedDisputed: includeRejected };
    switch (selectedScope) {
      case 'members':
        return membersToCsv(data.members, options);
      case 'events':
        return eventsToCsv(data.events, options);
      case 'payments':
        return paymentsToCsv(data.payments, options);
      case 'settlements':
        return settlementsToCsv(data.settlements, options);
      case 'recurring':
        return recurringTemplatesToCsv(data.recurringTemplates);
      case 'tags':
        return tagsToCsv(data.tags);
      case 'debts':
      default:
        return debtsToCsv(data.ledgerEntries, options);
    }
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Data portability"
        title="Export and share"
        subtitle="Review exactly what will be included before creating files or sharing event summaries."
        action={<Button title="Import CSV" icon="cloud-upload" variant="secondary" onPress={() => router.push('/import-csv')} />}
      />

      <Card tone="amber">
        <SectionTitle title="Privacy controls" subtitle="Private data stays out unless you turn it on here." />
        <PrivacySwitch label="Include private notes" value={includeNotes} onValueChange={setIncludeNotes} />
        <PrivacySwitch label="Include comments" value={includeComments} onValueChange={setIncludeComments} />
        <PrivacySwitch label="Include attachment references" value={includeAttachments} onValueChange={setIncludeAttachments} />
        <PrivacySwitch label="Include rejected/disputed" value={includeRejected} onValueChange={setIncludeRejected} />
        <PrivacySwitch label="Include archived records" value={includeArchived} onValueChange={setIncludeArchived} />
        <Text style={styles.body}>Attachment images are referenced by metadata; large images are not embedded automatically.</Text>
      </Card>

      <Card>
        <SectionTitle title="CSV export" subtitle="Machine-readable files preserve native currency, status, verification, payment, and timestamps." />
        <SelectChips
          label="Scope"
          value={scope}
          options={[
            { label: 'Debts', value: 'debts' },
            { label: 'Members', value: 'members' },
            { label: 'Events', value: 'events' },
            { label: 'Payments', value: 'payments' },
            { label: 'Settlements', value: 'settlements' },
            { label: 'Recurring', value: 'recurring' },
            { label: 'Tags', value: 'tags' },
          ]}
          onChange={setScope}
        />
        <Button title="Generate CSV" icon="download" onPress={exportCsv} />
      </Card>

      <Card>
        <SectionTitle title="Event summaries" subtitle="PDF includes balances, suggestions, included/excluded records, and calculation settings." />
        <View style={styles.buttonRow}>
          <Button title="Export event PDF" icon="document-text" onPress={exportFirstEventPdf} />
          <Button title="Share event text" icon="share" variant="secondary" onPress={shareFirstEventText} />
        </View>
      </Card>
    </Screen>
  );
}

function PrivacySwitch({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.lineStrong, true: palette.brandSoft }}
        thumbColor={value ? palette.brand : '#FFFFFF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  switchLabel: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
