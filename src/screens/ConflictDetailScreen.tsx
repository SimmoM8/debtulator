import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { isFinancialConflict } from '@/src/services/stage6Sync';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { ConflictResolution } from '@/src/types/models';

export function ConflictDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const conflict = data.syncConflicts.find((item) => item.id === id);

  if (!conflict) {
    return (
      <Screen>
        <EmptyState title="Conflict not found" body="It may already have been resolved." />
      </Screen>
    );
  }

  const currentConflict = conflict;
  const financial = isFinancialConflict(currentConflict);

  function resolve(resolution: ConflictResolution) {
    const action = () =>
      data.resolveSyncConflict(currentConflict.id, resolution, auth.identity.authenticatedUserId).then(() => router.back());
    if (financial && ['keep_mine', 'merge', 'manual_edit'].includes(resolution)) {
      Alert.alert(
        'Financial history warning',
        'This conflict affects balances or verified history. The chosen resolution is audited and may require re-verification.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', style: 'destructive', onPress: action },
        ],
      );
      return;
    }
    action();
  }

  return (
    <Screen>
      <PageHeader eyebrow="Conflict review" title={currentConflict.entityType.replaceAll('_', ' ')} subtitle={currentConflict.conflictType.replaceAll('_', ' ')} />

      <Card tone={financial ? 'amber' : 'blue'}>
        <View style={styles.badgeLine}>
          <Badge label={financial ? 'financial impact' : 'non-financial'} tone={financial ? 'negative' : 'blue'} />
          <Badge label={currentConflict.status} tone={currentConflict.status === 'unresolved' ? 'amber' : 'neutral'} />
        </View>
        <Text style={styles.body}>
          Compare the local draft against the remote version. Keep mine replays the local change if permission still allows it;
          keep theirs discards the queued local change while preserving this snapshot.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Local changes" />
        <Text style={styles.code}>{JSON.stringify(currentConflict.localSnapshot, null, 2)}</Text>
      </Card>

      <Card>
        <SectionTitle title="Remote changes" />
        <Text style={styles.code}>{JSON.stringify(currentConflict.remoteSnapshot, null, 2)}</Text>
      </Card>

      <Card>
        <SectionTitle title="Resolution" subtitle="Financial fields require explicit review." />
        <View style={styles.actions}>
          <Button title="Keep mine" icon="cloud-upload" onPress={() => resolve('keep_mine')} />
          <Button title="Keep theirs" icon="cloud-download" variant="secondary" onPress={() => resolve('keep_theirs')} />
          <Button title="Merge" icon="git-merge" variant="secondary" onPress={() => resolve('merge')} />
          <Button title="Duplicate" icon="copy" variant="secondary" onPress={() => resolve('duplicate')} />
          <Button title="Cancel local" icon="close" variant="ghost" onPress={() => resolve('cancel_local_change')} />
          <Button title="Manual edit" icon="create" variant="secondary" onPress={() => resolve('manual_edit')} />
        </View>
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
  code: {
    color: palette.ink,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
