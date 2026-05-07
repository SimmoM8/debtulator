import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { isFinancialConflict } from '@/src/services/stage6Sync';
import { useAppData } from '@/src/state/AppDataProvider';

export function ConflictCenterScreen() {
  const data = useAppData();
  const conflicts = data.syncConflicts.filter((conflict) => conflict.status === 'unresolved');

  return (
    <Screen>
      <PageHeader eyebrow="Sync review" title="Conflict center" subtitle="Conflicts that affect balances are never auto-resolved." />
      <Card tone={conflicts.length ? 'amber' : 'mint'}>
        <SectionTitle title={`${conflicts.length} unresolved`} subtitle="Review local and remote versions before choosing a resolution." />
        <Text style={styles.body}>Financial conflicts keep the local snapshot, remote snapshot, and chosen resolution in audit history.</Text>
      </Card>

      <Card>
        <SectionTitle title="Open conflicts" />
        {conflicts.length ? (
          conflicts.map((conflict) => (
            <View key={conflict.id} style={styles.row}>
              <View style={styles.badgeLine}>
                <Badge label={conflict.entityType.replaceAll('_', ' ')} tone="blue" />
                <Badge label={conflict.conflictType.replaceAll('_', ' ')} tone={isFinancialConflict(conflict) ? 'negative' : 'amber'} />
              </View>
              <Text style={styles.title}>{conflict.localEntityId}</Text>
              <Text style={styles.meta}>Detected {new Date(conflict.detectedAt).toLocaleString()}</Text>
              <Button title="Review" icon="chevron-forward" variant="secondary" onPress={() => router.push(`/conflict/${conflict.id}` as never)} />
            </View>
          ))
        ) : (
          <EmptyState title="No conflicts" body="Queued edits will appear here if remote records changed first." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    fontSize: 12,
  },
});
