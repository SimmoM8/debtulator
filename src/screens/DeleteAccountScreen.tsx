import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, PageHeader, Screen, SectionTitle, TextField } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';

export function DeleteAccountScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [deleteLocalData, setDeleteLocalData] = useState(false);
  const [keepLocalArchive, setKeepLocalArchive] = useState(true);
  const canRequest = confirmation.trim().toUpperCase() === 'DELETE';

  function requestDeletion() {
    if (!canRequest) {
      Alert.alert('Confirmation required', 'Type DELETE to request account deletion.');
      return;
    }
    Alert.alert(
      'Request account deletion?',
      'Remote personal data, push tokens, and future notifications should be revoked. Shared financial history may be anonymized instead of destroyed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record request',
          style: 'destructive',
          onPress: async () => {
            await data.createAuditLog({
              actorUserId: auth.identity.authenticatedUserId,
              action: 'account_deletion_requested',
              targetType: 'account',
              targetId: auth.identity.authenticatedUserId,
              eventId: null,
              metadata: { deleteLocalData, keepLocalArchive },
            });
            if (deleteLocalData && !keepLocalArchive) {
              await data.resetLocalData(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <PageHeader eyebrow="Destructive action" title="Delete account" subtitle="Deletion is deliberate and preserves shared ledger integrity where required." />

      <Card tone="amber">
        <SectionTitle title="Before deletion" subtitle="Export your data first if you need a copy." />
        <Text style={styles.body}>Personal profile data, push tokens, notification schedules, and account backup records should be removed or anonymized. Shared event financial records used by other participants are preserved in a privacy-conscious form so ledgers do not break.</Text>
      </Card>

      <Card>
        <SectionTitle title="Local data choice" />
        <ToggleRow title="Keep local-only archive on this device" value={keepLocalArchive} onValueChange={setKeepLocalArchive} />
        <ToggleRow title="Delete local data too" value={deleteLocalData} onValueChange={setDeleteLocalData} />
        <TextField label="Type DELETE to continue" value={confirmation} onChangeText={setConfirmation} />
        <Button title="Request account deletion" icon="trash" variant="danger" disabled={!canRequest} onPress={requestDeletion} />
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
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
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
});
