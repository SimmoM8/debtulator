import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, LoadingState, PageHeader, Screen, SectionTitle, TextField } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { previewCsvImport, type ImportPreviewRow } from '@/src/services/csv';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import { todayIsoDate } from '@/src/utils/id';

export function ImportCsvScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [sourceName, setSourceName] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const previewRows = useMemo(() => previewCsvImport(csvText, data.members), [csvText, data.members]);
  const validRows = previewRows.filter((row) => row.valid);
  const errorCount = previewRows.reduce((total, row) => total + row.errors.length, 0);

  if (data.loading) {
    return <LoadingState />;
  }

  async function loadFromUri() {
    if (!fileUri.trim()) {
      return;
    }
    try {
      const text = await FileSystem.readAsStringAsync(fileUri.trim(), { encoding: FileSystem.EncodingType.UTF8 });
      setCsvText(text);
      setSourceName(fileUri.split('/').pop() ?? 'CSV file');
    } catch {
      Alert.alert('Could not read CSV', 'Check the file URI or paste CSV text directly.');
    }
  }

  async function confirmImport() {
    if (!validRows.length) {
      return;
    }
    setImporting(true);
    try {
      const memberByName = new Map(data.members.map((member) => [member.displayName.trim().toLowerCase(), member]));
      let importedMembers = 0;
      let importedDebts = 0;

      for (const row of validRows) {
        if (row.kind === 'member') {
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
        if (row.kind !== 'debt') {
          continue;
        }
        const normalized = row.normalized;
        const memberName = normalized.memberName;
        if (!memberName || !normalized.title || !normalized.amount || !normalized.currency || !normalized.direction) {
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
          verificationStatus: 'local_only',
          visibility: 'private',
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
      Alert.alert('Import complete', `${importedMembers} members and ${importedDebts} debts imported as private local records.`);
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

      <Card tone="lavender">
        <SectionTitle title="Choose CSV" subtitle="Use a file URI when available, or paste CSV content directly." />
        <TextField label="Source name" value={sourceName} onChangeText={setSourceName} placeholder="debts.csv" />
        <TextField label="File URI" value={fileUri} onChangeText={setFileUri} placeholder="file:///.../debts.csv" />
        <Button title="Load from URI" icon="cloud-upload" variant="secondary" onPress={loadFromUri} disabled={!fileUri.trim()} />
        <TextField
          label="CSV text"
          value={csvText}
          onChangeText={setCsvText}
          placeholder="display_name,email&#10;Daniel,daniel@example.com"
          multiline
        />
      </Card>

      <Card tone={errorCount ? 'amber' : 'peach'}>
        <SectionTitle title="Preview" subtitle="Invalid rows can be fixed in the CSV text or skipped by importing valid rows only." />
        <View style={styles.badgeLine}>
          <Badge label={`${previewRows.length} rows`} tone="blue" />
          <Badge label={`${validRows.length} valid`} tone="positive" />
          <Badge label={`${errorCount} errors`} tone={errorCount ? 'negative' : 'neutral'} />
        </View>
        {previewRows.length ? (
          previewRows.slice(0, 30).map((row) => <PreviewRow key={row.index} row={row} />)
        ) : (
          <EmptyState title="No rows parsed" body="Paste CSV text or load a file URI to preview the import." />
        )}
        <Button
          title={importing ? 'Importing...' : 'Confirm import'}
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
        <Badge label={`Row ${row.index + 2}`} tone={row.valid ? 'positive' : 'negative'} />
        <Badge label={row.kind} tone="blue" />
      </View>
      <Text style={styles.rowTitle}>
        {row.kind === 'member'
          ? row.normalized.displayName || 'Missing member name'
          : `${row.normalized.title || 'Missing title'} · ${row.normalized.memberName || 'Missing member'}`}
      </Text>
      {row.warnings.map((warning) => (
        <Text key={warning} style={styles.warningText}>{warning}</Text>
      ))}
      {row.errors.map((error) => (
        <Text key={error} style={styles.errorText}>{error}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 14,
    fontWeight: '900',
  },
  warningText: {
    color: palette.amber,
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: palette.negative,
    fontSize: 13,
    fontWeight: '800',
  },
});
