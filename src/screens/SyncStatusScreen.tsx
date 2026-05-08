import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { canRetrySyncEntry } from '@/src/services/stage6Sync';
import { useAppData } from '@/src/state/AppDataProvider';

export function SyncStatusScreen() {
  const data = useAppData();
  const pending = data.syncQueue.filter((entry) => ['pending', 'running', 'failed', 'conflict'].includes(entry.status));

  return (
    <Screen>
      <PageHeader
        eyebrow="Data safety"
        title="Sync status"
        subtitle="Offline changes are queued locally and never discarded silently."
        action={<Button title="Conflicts" icon="git-compare" variant="secondary" onPress={() => router.push('/conflicts' as never)} />}
      />

      <Card tone={data.syncSummary.hasBlockingProblems ? 'amber' : 'lavender'}>
        <SectionTitle title={data.syncSummary.statusLabel} subtitle="Central sync state for local and shared records." />
        <View style={styles.badgeLine}>
          <Badge label={`${data.syncSummary.pendingCount} pending`} tone={data.syncSummary.pendingCount ? 'amber' : 'neutral'} />
          <Badge label={`${data.syncSummary.conflictCount} conflicts`} tone={data.syncSummary.conflictCount ? 'negative' : 'neutral'} />
          <Badge label={`${data.syncSummary.failedCount} failed`} tone={data.syncSummary.failedCount ? 'negative' : 'neutral'} />
          <Badge label={`${data.syncSummary.localOnlyCount} local-only`} tone="blue" />
        </View>
        <Text style={styles.body}>
          Private local-only records stay on this device unless account backup is explicitly enabled. Shared financial edits
          that cannot be checked safely are blocked or queued for review.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Pending changes" subtitle="Queue entries survive restart and keep dependency order." />
        {pending.length ? (
          pending.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.flexOne}>
                <Text style={styles.title}>{entry.operation.replaceAll('_', ' ')} {entry.entityType.replaceAll('_', ' ')}</Text>
                <Text style={styles.meta}>
                  {entry.status} · retries {entry.retryCount} · {entry.errorMessage ?? 'waiting for sync'}
                </Text>
              </View>
              <View style={styles.actions}>
                {entry.status === 'failed' && canRetrySyncEntry(entry) ? (
                  <Button title="Retry" icon="refresh" variant="secondary" onPress={() => data.updateSyncQueueEntry(entry.id, { status: 'pending', errorCode: null, errorMessage: null })} />
                ) : null}
                {entry.status === 'failed' || entry.status === 'conflict' ? (
                  <Button title="Cancel" icon="close" variant="ghost" onPress={() => data.updateSyncQueueEntry(entry.id, { status: 'cancelled' })} />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No pending sync work" body="Local-only records remain private and are not shown as sync work." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
