import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  MultiSelectChips,
  PageHeader,
  Screen,
  SectionTitle,
  SelectChips,
  TextField,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { palette, spacing } from '@/src/constants/design';
import { buildSplitObligations, calculateParticipantShares, validateSplit } from '@/src/services/splits';
import { participantName } from '@/src/services/ledger';
import { suggestTags } from '@/src/services/smartSuggestions';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { CurrencyCode, DebtStatus, DebtVisibility, ExpensePayer, ParticipantId, SplitMethod, VerificationStatus } from '@/src/types/models';
import { createId, todayIsoDate } from '@/src/utils/id';
import { formatMoney } from '@/src/utils/money';

export function ExpenseFormScreen() {
  const { id, eventId } = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const data = useAppData();
  const auth = useAuth();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  const initialEventId = expense?.eventId ?? eventId ?? data.events.find((event) => !event.archived)?.id ?? '';

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const selectedEvent = data.events.find((event) => event.id === selectedEventId);
  const isSharedEvent = selectedEvent?.visibility === 'shared';
  const eventMemberIds = useMemo(
    () =>
      isSharedEvent
        ? data.sharedEventMembers
            .filter((eventMember) => eventMember.eventId === selectedEventId && eventMember.status !== 'archived' && eventMember.status !== 'merged')
            .map((eventMember) => eventMember.id)
        : data.eventMembers
            .filter((eventMember) => eventMember.eventId === selectedEventId)
            .map((eventMember) => eventMember.memberId),
    [data.eventMembers, data.sharedEventMembers, isSharedEvent, selectedEventId],
  );
  const currentEventMember = useMemo(
    () =>
      data.sharedEventMembers.find(
        (member) =>
          isSharedEvent &&
          member.eventId === selectedEventId &&
          member.linkedUserId === auth.identity.authenticatedUserId &&
          member.status !== 'merged',
      ),
    [auth.identity.authenticatedUserId, data.sharedEventMembers, isSharedEvent, selectedEventId],
  );
  const defaultParticipants = useMemo<ParticipantId[]>(
    () => (isSharedEvent ? eventMemberIds : ['me', ...eventMemberIds]),
    [eventMemberIds, isSharedEvent],
  );

  const [payerId, setPayerId] = useState<ParticipantId>(expense?.payerId ?? currentEventMember?.id ?? 'me');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(expense?.currency ?? selectedEvent?.defaultCurrency ?? data.settings.baseCurrency);
  const [title, setTitle] = useState(expense?.title ?? '');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? todayIsoDate());
  const [participantIds, setParticipantIds] = useState<ParticipantId[]>(expense?.participantIds ?? defaultParticipants);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(expense?.splitMethod ?? 'equal');
  const [splitAllocations, setSplitAllocations] = useState<Record<ParticipantId, string>>(
    Object.fromEntries(Object.entries(expense?.splitAllocations ?? {}).map(([participantId, value]) => [participantId, String(value)])),
  );
  const [payerAmounts, setPayerAmounts] = useState<Record<ParticipantId, string>>(
    Object.fromEntries((expense?.expensePayers ?? []).map((payer) => [payer.eventMemberId, String(payer.amountPaid)])),
  );
  const [tags, setTags] = useState(expense?.tags.join(', ') ?? '');
  const [status, setStatus] = useState<DebtStatus>(expense?.status ?? 'active');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(expense?.verificationStatus ?? 'local_only');

  useEffect(() => {
    if (!expense) {
      setParticipantIds(defaultParticipants);
      setPayerId(isSharedEvent ? currentEventMember?.id ?? defaultParticipants[0] ?? 'me' : 'me');
      if (selectedEvent) {
        setCurrency(selectedEvent.defaultCurrency);
      }
    }
  }, [currentEventMember?.id, defaultParticipants, expense, isSharedEvent, selectedEvent]);

  const eventOptions = useMemo(
    () => data.events.filter((event) => !event.archived).map((event) => ({ label: event.name, value: event.id })),
    [data.events],
  );
  const participantOptions = useMemo(
    () => [
      ...(isSharedEvent ? [] : [{ label: 'You', value: 'me' as ParticipantId }]),
      ...eventMemberIds.map((memberId) => ({
        label:
          data.sharedEventMembers.find((member) => member.id === memberId)?.displayName ??
          data.members.find((member) => member.id === memberId)?.displayName ??
          'Member',
        value: memberId,
      })),
    ],
    [data.members, data.sharedEventMembers, eventMemberIds, isSharedEvent],
  );
  const tagSuggestions = useMemo(
    () =>
      suggestTags({
        title,
        notes,
        event: selectedEvent,
        previousEntries: data.ledgerEntries,
        existingTags: splitTags(tags),
      }),
    [data.ledgerEntries, notes, selectedEvent, tags, title],
  );

  const numericSplitAllocations = Object.fromEntries(
    participantIds.map((participantId) => [participantId, Number(splitAllocations[participantId]) || 0]),
  ) as Record<ParticipantId, number>;
  const expensePayers = buildPayersForSave(expense?.id ?? createId('expense_preview'), payerId, amount, currency, payerAmounts);
  const splitErrors = validateSplit({
    amount: Number(amount) || 0,
    participantIds,
    splitMethod,
    splitAllocations: numericSplitAllocations,
    expensePayers,
    currency,
  });
  const shares = calculateParticipantShares({
    amount: Number(amount) || 0,
    participantIds,
    splitMethod,
    splitAllocations: numericSplitAllocations,
  });
  const obligations = buildSplitObligations({
    expenseId: expense?.id ?? createId('expense_preview'),
    eventId: selectedEventId,
    payerId,
    expensePayers,
    amount: Number(amount) || 0,
    currency,
    participantIds,
    splitMethod,
    splitAllocations: numericSplitAllocations,
  });

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    const visibility: DebtVisibility = isSharedEvent ? 'shared_event' : 'private';
    const input = {
      eventId: selectedEventId,
      creatorUserId: isSharedEvent ? auth.identity.authenticatedUserId : null,
      payerId,
      amount: Number(amount),
      currency,
      title,
      notes,
      expenseDate,
      participantIds,
      splitMethod,
      splitAllocations: numericSplitAllocations,
      expensePayers: buildPayersForSave(expense?.id ?? createId('expense_preview'), payerId, amount, currency, payerAmounts).map((payer) => ({
        eventMemberId: payer.eventMemberId,
        amountPaid: payer.amountPaid,
      })),
      tags: splitTags(tags),
      status,
      verificationStatus,
      visibility,
    };

    if (expense) {
      await data.updateSharedExpense(expense.id, input);
    } else {
      await data.createSharedExpense(input);
    }

    router.back();
  }

  if (data.events.filter((event) => !event.archived).length === 0) {
    return (
      <Screen>
        <PageHeader eyebrow="Shared expense" title="Add expense" subtitle="Shared expenses live inside events." />
        <EmptyState
          title="Create an event first"
          body="Inside events, Debtulator defaults to shared expenses and equal splits."
          action={<Button title="Add event" icon="people" onPress={() => router.push('/event/form')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={expense ? 'Save expense' : 'Create expense'}
          icon="checkmark"
          onPress={save}
          disabled={!selectedEventId || !title.trim() || Number(amount) <= 0 || participantIds.length === 0 || splitErrors.length > 0}
        />
      }>
      <PageHeader
        eyebrow="Shared expense"
        title={expense ? 'Edit expense' : 'Add expense'}
        subtitle="Default event flow: one payer, equal split, custom participant selection."
      />

      <Card>
        <SelectChips label="Event" value={selectedEventId} options={eventOptions} onChange={setSelectedEventId} />
        <SelectChips label="Primary payer" value={payerId} options={participantOptions} onChange={setPayerId} />
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Groceries" />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <SelectChips
          label="Currency"
          value={currency}
          options={CURRENCIES.map((currencyCode) => ({ label: currencyCode, value: currencyCode }))}
          onChange={setCurrency}
        />
        <TextField label="Expense date" value={expenseDate} onChangeText={setExpenseDate} placeholder="YYYY-MM-DD" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <TextField label="Tags" value={tags} onChangeText={setTags} placeholder="Food, Travel" />
        {tagSuggestions.length ? (
          <SelectChips
            label="Suggested tags"
            value="none"
            options={[{ label: 'Ignore', value: 'none' }, ...tagSuggestions.map((tag) => ({ label: tag, value: tag }))]}
            onChange={(value) => {
              if (value !== 'none') {
                setTags((current) => mergeTagText(current, value));
              }
            }}
          />
        ) : null}
        <MultiSelectChips label="Split participants" values={participantIds} options={participantOptions} onChange={setParticipantIds} />
        <SelectChips
          label="Split method"
          value={splitMethod}
          options={[
            { label: 'Equal', value: 'equal' },
            { label: 'Custom amounts', value: 'custom_amount' },
            { label: 'Percentages', value: 'custom_percentage' },
            { label: 'Shares', value: 'shares' },
          ]}
          onChange={setSplitMethod}
        />
        {splitMethod !== 'equal'
          ? participantIds.map((participantId) => (
              <TextField
                key={participantId}
                label={`${participantName(participantId, data.members, data.sharedEventMembers)} ${
                  splitMethod === 'custom_amount' ? 'amount' : splitMethod === 'custom_percentage' ? 'percent' : 'weight'
                }`}
                value={splitAllocations[participantId] ?? ''}
                onChangeText={(value) => setSplitAllocations((current) => ({ ...current, [participantId]: value }))}
                keyboardType="numeric"
              />
            ))
          : null}
        <SectionTitle title="Paid by" subtitle="Multiple payer contributions must total the expense amount." />
        {participantOptions.map((option) => (
          <TextField
            key={option.value}
            label={`${option.label} paid`}
            value={payerAmounts[option.value] ?? (option.value === payerId && Object.keys(payerAmounts).length === 0 ? amount : '')}
            onChangeText={(value) => setPayerAmounts((current) => ({ ...current, [option.value]: value }))}
            keyboardType="numeric"
          />
        ))}
        <SelectChips
          label="Status"
          value={status}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Settled', value: 'settled' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={setStatus}
        />
        <SelectChips
          label="Verification placeholder"
          value={verificationStatus}
          options={[
            { label: 'Local only', value: 'local_only' },
            { label: 'Pending', value: 'pending' },
            { label: 'Verified', value: 'verified' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Disputed', value: 'disputed' },
            { label: 'Resolved', value: 'resolved' },
          ]}
          onChange={setVerificationStatus}
        />
      </Card>

      <Card tone="blue">
        <Text style={styles.label}>Split preview</Text>
        {splitErrors.map((error) => (
          <Text key={error} style={styles.errorText}>{error}</Text>
        ))}
        {participantIds.map((participantId) => (
          <View key={`share_${participantId}`} style={styles.previewRow}>
            <Text style={styles.previewText}>{participantName(participantId, data.members, data.sharedEventMembers)} share</Text>
            <Text style={styles.previewMoney}>{formatMoney(shares[participantId] ?? 0, currency)}</Text>
          </View>
        ))}
        {obligations.length > 0 ? (
          obligations.map((obligation) => (
            <View key={obligation.id} style={styles.previewRow}>
              <Text style={styles.previewText}>
                {participantName(obligation.fromParticipantId, data.members, data.sharedEventMembers)} owes{' '}
                {participantName(obligation.toParticipantId, data.members, data.sharedEventMembers)}
              </Text>
              <Text style={styles.previewMoney}>{formatMoney(obligation.amount, obligation.currency)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.previewText}>No generated obligations when only the payer is selected.</Text>
        )}
      </Card>
    </Screen>
  );
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mergeTagText(current: string, tag: string) {
  return Array.from(new Set([...splitTags(current), tag])).join(', ');
}

const styles = StyleSheet.create({
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CAD7EF',
  },
  previewText: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  previewMoney: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    color: palette.negative,
    fontSize: 13,
    fontWeight: '800',
  },
});

function buildPayersForSave(
  expenseId: string,
  payerId: ParticipantId,
  amount: string,
  currency: CurrencyCode,
  payerAmounts: Record<ParticipantId, string>,
): ExpensePayer[] {
  const entries = Object.entries(payerAmounts)
    .map(([eventMemberId, paid]) => ({ eventMemberId, amountPaid: Number(paid) || 0 }))
    .filter((payer) => payer.amountPaid > 0);
  const payers = entries.length ? entries : [{ eventMemberId: payerId, amountPaid: Number(amount) || 0 }];
  return payers.map((payer, index) => ({
    id: `${expenseId}_payer_${payer.eventMemberId}_${index}`,
    expenseId,
    eventMemberId: payer.eventMemberId,
    amountPaid: payer.amountPaid,
    currency,
    createdAt: '',
    updatedAt: '',
  }));
}
