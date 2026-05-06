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
import { participantName } from '@/src/services/ledger';
import { explainSplit } from '@/src/services/splits';
import { useAppData } from '@/src/state/AppDataProvider';
import type { DebtStatus, VerificationStatus } from '@/src/types/models';
import { formatMoney } from '@/src/utils/money';

export function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  const event = expense ? data.events.find((item) => item.id === expense.eventId) : undefined;

  if (data.loading) {
    return <LoadingState />;
  }

  if (!expense || !event) {
    return (
      <Screen>
        <EmptyState title="Expense not found" body="This shared expense may have been archived or removed." />
      </Screen>
    );
  }

  const currentExpense = expense;
  const splitExplanation = explainSplit({
    amount: expense.amount,
    currency: expense.currency,
    participantIds: expense.participantIds,
    splitMethod: expense.splitMethod,
    splitAllocations: expense.splitAllocations,
    expensePayers: expense.expensePayers,
  });

  async function updateStatus(status: DebtStatus) {
    await data.updateSharedExpense(currentExpense.id, { status });
  }

  async function updateVerification(verificationStatus: VerificationStatus) {
    await data.updateSharedExpense(currentExpense.id, { verificationStatus });
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Shared expense"
        title={expense.title}
        subtitle={`${participantName(expense.payerId, data.members, data.sharedEventMembers)} paid in ${event.name}`}
        action={<IconButton icon="create-outline" label="Edit expense" onPress={() => router.push({ pathname: '/expense/form', params: { id: expense.id } })} />}
      />

      <Card tone={expense.verificationStatus === 'rejected' || expense.verificationStatus === 'disputed' ? 'coral' : 'mint'}>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.label}>Paid amount</Text>
            <Amount amount={expense.amount} currency={expense.currency} size="lg" />
          </View>
          <View style={styles.badgeStack}>
            <StatusBadge status={expense.status} />
            <VerificationBadge status={expense.verificationStatus} />
          </View>
        </View>
        <Text style={styles.body}>
          Split by {expense.splitMethod.replaceAll('_', ' ')} between{' '}
          {expense.participantIds
            .map((participantId) => participantName(participantId, data.members, data.sharedEventMembers))
            .join(', ')}
          .
        </Text>
        {expense.notes ? <Text style={styles.body}>{expense.notes}</Text> : null}
        <TagChips tags={expense.tags} />
      </Card>

      {expense.verificationStatus === 'rejected' || expense.verificationStatus === 'disputed' ? (
        <Card tone="coral">
          <SectionTitle title={expense.verificationStatus === 'rejected' ? 'Rejected expense' : 'Disputed expense'} subtitle="Excluded from shared settlement by default." />
          <Text style={styles.body}>
            This expense remains in your private local ledger. Rejected and disputed records are omitted from default
            event settlement suggestions until they are resolved or kept privately.
          </Text>
          <View style={styles.actionRow}>
            <Button title="Keep privately" icon="lock-closed" variant="secondary" onPress={() => updateVerification('local_only')} />
            <Button title="Mark resolved" icon="checkmark-circle" variant="secondary" onPress={() => updateVerification('resolved')} />
            <Button title="Archive" icon="archive" variant="danger" onPress={() => updateStatus('archived')} />
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Split explanation" subtitle="Shares, payer contributions, and resulting obligations." />
        <Text style={styles.label}>Paid by</Text>
        {expense.expensePayers.map((payer) => (
          <View key={payer.id} style={styles.infoRow}>
            <Text style={styles.infoValue}>{participantName(payer.eventMemberId, data.members, data.sharedEventMembers)}</Text>
            <Text style={styles.money}>{formatMoney(payer.amountPaid, payer.currency)}</Text>
          </View>
        ))}
        <Text style={styles.label}>Participant shares</Text>
        {Object.entries(splitExplanation.participantShares).map(([participantId, share]) => (
          <View key={participantId} style={styles.infoRow}>
            <Text style={styles.infoValue}>{participantName(participantId, data.members, data.sharedEventMembers)}</Text>
            <Text style={styles.money}>{formatMoney(share, expense.currency)}</Text>
          </View>
        ))}
        <Text style={styles.label}>Generated obligations</Text>
        {expense.generatedObligations.map((obligation) => (
          <View key={obligation.id} style={styles.infoRow}>
            <Text style={styles.infoValue}>
              {participantName(obligation.fromParticipantId, data.members, data.sharedEventMembers)} pays{' '}
              {participantName(obligation.toParticipantId, data.members, data.sharedEventMembers)}
            </Text>
            <Text style={styles.money}>{formatMoney(obligation.amount, obligation.currency)}</Text>
          </View>
        ))}
        <Text style={styles.body}>
          Rounding adjustment: {formatMoney(splitExplanation.roundingAdjustment, expense.currency)}. Payer contribution total:{' '}
          {formatMoney(splitExplanation.payerContributionTotal, expense.currency)}.
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Local status controls" subtitle="Financial edits to verified expenses reset local verification to pending." />
        <SelectChips
          label="Expense status"
          value={expense.status}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Settled', value: 'settled' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={updateStatus}
        />
        <SelectChips
          label="Verification"
          value={expense.verificationStatus}
          options={[
            { label: 'Local only', value: 'local_only' },
            { label: 'Pending', value: 'pending' },
            { label: 'Partially verified', value: 'partially_verified' },
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
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoValue: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  money: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});
