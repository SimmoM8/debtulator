import * as FileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, PageHeader, Screen, SectionTitle, SelectChips } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';
import type { DataExportFormat } from '@/src/types/models';

export function FullDataExportScreen() {
  const data = useAppData();
  const [format, setFormat] = useState<DataExportFormat>('json');
  const [includeAttachments, setIncludeAttachments] = useState(data.settings.includeAttachmentsInExports);
  const [includePrivateNotes, setIncludePrivateNotes] = useState(data.settings.includePrivateNotesInExports);

  async function exportData() {
    const exportedAt = new Date().toISOString();
    const payload = {
      app: 'Debtulator',
      schemaVersion: 6,
      exportedAt,
      format,
      labels: {
        sharedRecords: 'Records marked shared were visible according to current local permission cache.',
        estimatedCurrency: 'Estimated converted values are approximate.',
      },
      data: {
        profiles: data.profiles,
        settings: data.settings,
        members: data.members,
        debts: data.debts,
        expenses: data.sharedExpenses,
        events: data.events,
        eventMembers: data.sharedEventMembers,
        eventParticipants: data.eventParticipants,
        payments: data.payments,
        settlements: data.settlements,
        tags: data.tags,
        comments: includePrivateNotes ? data.comments : data.comments.filter((comment) => comment.visibility === 'shared'),
        attachments: includeAttachments ? data.attachments : data.attachments.map((attachment) => ({ ...attachment, localUri: null, remoteUrl: null })),
        recurringTemplates: data.recurringTemplates,
        reminders: data.reminders,
        activityLogs: data.activityLogs,
        auditLogs: data.auditLogs,
        smartSuggestions: data.smartSuggestions,
        notificationPreferences: {
          push: data.settings.pushNotificationsEnabled,
          email: data.settings.emailNotificationsEnabled,
        },
      },
    };
    const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!directory) {
      throw new Error('No writable export directory is available.');
    }
    const uri = `${directory}debtulator-full-export-${exportedAt.slice(0, 10)}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    await data.createExportLog({
      userId: null,
      exportType: format === 'json' ? 'text_summary' : 'csv',
      targetType: 'ledger',
      targetId: null,
      metadata: { includeAttachments, includePrivateNotes, fullExport: true },
    });
    await data.createAuditLog({
      actorUserId: null,
      action: 'export_generated',
      targetType: 'backup',
      targetId: uri,
      eventId: null,
      metadata: { format, includeAttachments, includePrivateNotes },
    });
    await Share.share({ url: uri, message: 'Debtulator full data export' });
  }

  return (
    <Screen>
      <PageHeader eyebrow="Account data" title="Full data export" subtitle="Exports only locally accessible data and clearly labels private/shared records." />

      <Card>
        <SectionTitle title="Export options" subtitle="JSON is the complete production-grade export format." />
        <SelectChips
          label="Format"
          value={format}
          onChange={setFormat}
          options={[
            { label: 'JSON', value: 'json' },
            { label: 'CSV package', value: 'csv_package' },
            { label: 'PDF summary', value: 'pdf_summary' },
          ]}
        />
        <ToggleRow title="Include attachment metadata" value={includeAttachments} onValueChange={setIncludeAttachments} />
        <ToggleRow title="Include private notes/comments" value={includePrivateNotes} onValueChange={setIncludePrivateNotes} />
        <Text style={styles.body}>Shared event data is included only from the local permission cache. Estimated currency values remain labelled approximate.</Text>
        <Button title="Generate export" icon="download" onPress={exportData} />
      </Card>
    </Screen>
  );
}

function ToggleRow({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.title}>{title}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: palette.lineStrong, true: palette.brandSoft }} thumbColor={value ? palette.brand : '#FFFFFF'} />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
