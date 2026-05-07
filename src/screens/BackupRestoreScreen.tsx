import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, PageHeader, Screen, SectionTitle, SelectChips, TextField } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { buildBackup, previewRestore, restoreModeDescription, shareBackupFile } from '@/src/services/backupRestore';
import { useAppData } from '@/src/state/AppDataProvider';
import type { BackupMode } from '@/src/types/models';

export function BackupRestoreScreen() {
  const data = useAppData();
  const [includeAttachments, setIncludeAttachments] = useState(data.settings.backupIncludeAttachments);
  const [includePrivateNotes, setIncludePrivateNotes] = useState(data.settings.backupIncludePrivateNotes);
  const [restoreJson, setRestoreJson] = useState('');
  const [restoreMode, setRestoreMode] = useState<BackupMode>('merge');
  const preview = useMemo(() => (restoreJson.trim() ? previewRestore(restoreJson) : null), [restoreJson]);

  async function createBackup() {
    const backup = buildBackup(data, { includeAttachments, includePrivateNotes });
    const uri = await shareBackupFile(backup);
    await data.updateSettings({
      backupIncludeAttachments: includeAttachments,
      backupIncludePrivateNotes: includePrivateNotes,
      lastBackupAt: backup.exportedAt,
    });
    await data.createAuditLog({
      actorUserId: null,
      action: 'backup_exported',
      targetType: 'backup',
      targetId: uri,
      eventId: null,
      metadata: { includeAttachments, includePrivateNotes },
    });
  }

  function confirmRestore() {
    if (!preview?.valid) {
      Alert.alert('Invalid backup', 'Paste a valid Debtulator backup JSON before restoring.');
      return;
    }
    Alert.alert(
      'Restore backup?',
      `${restoreModeDescription(restoreMode)} Restored synced records default to private/local unless explicitly re-shared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record restore',
          onPress: () =>
            data.createAuditLog({
              actorUserId: null,
              action: 'restore_performed',
              targetType: 'backup',
              targetId: null,
              eventId: null,
              metadata: { restoreMode, preview },
            }),
        },
      ],
    );
  }

  return (
    <Screen>
      <PageHeader eyebrow="Data safety" title="Backup and restore" subtitle="Backups default restored records to private/local copies." />

      <Card>
        <SectionTitle title="Create backup" subtitle="Manual JSON backup for this device ledger." />
        <ToggleRow title="Include attachment metadata" body="Attachment files are included only when practical; remote paths are not reused." value={includeAttachments} onValueChange={setIncludeAttachments} />
        <ToggleRow title="Include private notes/comments" body="Off by default to avoid exporting private context accidentally." value={includePrivateNotes} onValueChange={setIncludePrivateNotes} />
        <View style={styles.badgeLine}>
          <Badge label={data.settings.syncPrivateLocalDataToAccountBackup ? 'account backup opt-in' : 'local export only'} tone="blue" />
          <Badge label={data.settings.lastBackupAt ? `last ${data.settings.lastBackupAt.slice(0, 10)}` : 'no backup yet'} tone="neutral" />
        </View>
        <Button title="Create backup" icon="download" onPress={createBackup} />
      </Card>

      <Card>
        <SectionTitle title="Restore preview" subtitle="Paste backup JSON to validate before choosing a restore mode." />
        <TextField label="Backup JSON" value={restoreJson} onChangeText={setRestoreJson} multiline />
        <SelectChips
          label="Restore mode"
          value={restoreMode}
          onChange={setRestoreMode}
          options={[
            { label: 'Merge', value: 'merge' },
            { label: 'Replace local', value: 'replace_local' },
            { label: 'Duplicate/private', value: 'duplicate_private' },
          ]}
        />
        {preview ? (
          <View style={styles.preview}>
            <Badge label={preview.valid ? 'valid backup' : 'invalid'} tone={preview.valid ? 'positive' : 'negative'} />
            <Text style={styles.body}>
              {preview.memberCount} members · {preview.debtCount} debts · {preview.eventCount} events · {preview.paymentCount} payments · {preview.settlementCount} settlements
            </Text>
            {preview.warnings.map((warning) => (
              <Text key={warning} style={styles.warning}>{warning}</Text>
            ))}
          </View>
        ) : null}
        <Button title="Record restore decision" icon="refresh" variant="secondary" onPress={confirmRestore} />
      </Card>
    </Screen>
  );
}

function ToggleRow({ title, body, value, onValueChange }: { title: string; body: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
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
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  switchText: {
    flex: 1,
    gap: spacing.xs,
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
  warning: {
    color: palette.negative,
    fontSize: 12,
  },
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preview: {
    gap: spacing.sm,
  },
});
