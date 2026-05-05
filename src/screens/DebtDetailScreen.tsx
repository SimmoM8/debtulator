import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge, TagChips, VerificationBadge } from '@/src/components/ui/Badges';
import { Amount } from '@/src/components/ui/Money';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
  SelectChips,
} from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { buildLedgerEntries, entryDirectionText } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import type { DebtStatus, VerificationStatus } from '@/src/types/models';

export function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const debt = data.debts.find((item) => item.id === id);
  const member = debt ? data.members.find((item) => item.id === debt.memberId) : undefined;
  const event = debt?.eventId ? data.events.find((item) => item.id === debt.eventId) : undefined;
  const entry = debt ? buildLedgerEntries([debt], [])[0] : undefined;

  if (data.loading) {
    return <LoadingState />;
  }

  if (!debt || !entry) {
    return (
      <Screen>
        <EmptyState title="Debt not found" body="This debt may have been archived or removed." />
      </Screen>
    );
  }

  const currentDebt = debt;

  async function updateStatus(status: DebtStatus) {
    await data.updateDebt(currentDebt.id, { status });
  }

  async function updateVerification(verificationStatus: VerificationStatus) {
    await data.updateDebt(currentDebt.id, { verificationStatus });
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Simple debt"
        title={debt.title}
        subtitle={entryDirectionText(entry, data.members)}
        action={<IconButton icon="create-outline" label="Edit debt" onPress={() => router.push({ pathname: '/debt/form', params: { id: debt.id } })} />}
      />

      <Card tone={debt.verificationStatus === 'rejected' || debt.verificationStatus === 'disputed' ? 'coral' : 'mint'}>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.label}>Amount</Text>
            <Amount amount={debt.direction === 'they_owe_me' ? debt.amount : -debt.amount} currency={debt.currency} signed size="lg" />
          </View>
          <View style={styles.badgeStack}>
            <StatusBadge status={debt.status} />
            <VerificationBadge status={debt.verificationStatus} />
          </View>
        </View>
        <Text style={styles.body}>
          {debt.direction === 'they_owe_me'
            ? `${member?.displayName ?? 'This member'} owes you.`
            : `You owe ${member?.displayName ?? 'this member'}.`}
        </Text>
        {debt.notes ? <Text style={styles.body}>{debt.notes}</Text> : null}
        <TagChips tags={debt.tags} />
      </Card>

      {debt.verificationStatus === 'rejected' ? (
        <Card tone="coral">
          <SectionTitle title="Rejected debt" subtitle="This remains in your personal ledger." />
          <Text style={styles.body}>
            Rejected and disputed debts are excluded from shared settlement suggestions by default. You can keep this
            privately, edit it, mark it disputed or resolved, or archive it.
          </Text>
          <View style={styles.actionRow}>
            <Button title="Keep privately" icon="lock-closed" variant="secondary" onPress={() => updateVerification('local_only')} />
            <Button title="Edit" icon="create" variant="secondary" onPress={() => router.push({ pathname: '/debt/form', params: { id: debt.id } })} />
            <Button title="Mark disputed" icon="warning" variant="secondary" onPress={() => updateVerification('disputed')} />
            <Button title="Mark resolved" icon="checkmark-circle" variant="secondary" onPress={() => updateVerification('resolved')} />
            <Button title="Archive" icon="archive" variant="danger" onPress={() => updateStatus('archived')} />
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Metadata" subtitle="Financial edits to verified debts reset local verification to pending." />
        <InfoRow label="Member" value={member?.displayName ?? 'Unknown'} />
        <InfoRow label="Event" value={event?.name ?? 'Not attached'} />
        <InfoRow label="Debt date" value={debt.debtDate} />
        <InfoRow label="Due date" value={debt.dueDate ?? 'None'} />
        <InfoRow label="Created" value={new Date(debt.createdAt).toLocaleString()} />
        <InfoRow label="Updated" value={new Date(debt.updatedAt).toLocaleString()} />
        <InfoRow
          label="Balance impact"
          value={debt.direction === 'they_owe_me' ? 'Increases owed to you' : 'Increases what you owe'}
        />
      </Card>

      <Card>
        <SectionTitle title="Local status controls" subtitle="Stage 1 simulates future verification/dispute workflows locally." />
        <SelectChips
          label="Debt status"
          value={debt.status}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Settled', value: 'settled' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={updateStatus}
        />
        <SelectChips
          label="Verification"
          value={debt.verificationStatus}
          options={[
            { label: 'Local only', value: 'local_only' },
            { label: 'Pending', value: 'pending' },
            { label: 'Verified', value: 'verified' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Disputed', value: 'disputed' },
            { label: 'Resolved', value: 'resolved' },
          ]}
          onChange={updateVerification}
        />
      </Card>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  badgeStack: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  body: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
});
