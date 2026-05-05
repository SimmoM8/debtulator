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
  SelectChips,
  TextField,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { palette, spacing } from '@/src/constants/design';
import { buildEqualSplitObligations } from '@/src/services/splits';
import { participantName } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import type { CurrencyCode, DebtStatus, ParticipantId, VerificationStatus } from '@/src/types/models';
import { createId, todayIsoDate } from '@/src/utils/id';
import { formatMoney } from '@/src/utils/money';

export function ExpenseFormScreen() {
  const { id, eventId } = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const data = useAppData();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  const initialEventId = expense?.eventId ?? eventId ?? data.events.find((event) => !event.archived)?.id ?? '';

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const selectedEvent = data.events.find((event) => event.id === selectedEventId);
  const eventMemberIds = useMemo(
    () =>
      data.eventMembers
        .filter((eventMember) => eventMember.eventId === selectedEventId)
        .map((eventMember) => eventMember.memberId),
    [data.eventMembers, selectedEventId],
  );
  const defaultParticipants = useMemo<ParticipantId[]>(() => ['me', ...eventMemberIds], [eventMemberIds]);

  const [payerId, setPayerId] = useState<ParticipantId>(expense?.payerId ?? 'me');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(expense?.currency ?? selectedEvent?.defaultCurrency ?? data.settings.baseCurrency);
  const [title, setTitle] = useState(expense?.title ?? '');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? todayIsoDate());
  const [participantIds, setParticipantIds] = useState<ParticipantId[]>(expense?.participantIds ?? defaultParticipants);
  const [tags, setTags] = useState(expense?.tags.join(', ') ?? '');
  const [status, setStatus] = useState<DebtStatus>(expense?.status ?? 'active');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(expense?.verificationStatus ?? 'local_only');

  useEffect(() => {
    if (!expense) {
      setParticipantIds(defaultParticipants);
      setPayerId('me');
      if (selectedEvent) {
        setCurrency(selectedEvent.defaultCurrency);
      }
    }
  }, [defaultParticipants, expense, selectedEvent]);

  const eventOptions = useMemo(
    () => data.events.filter((event) => !event.archived).map((event) => ({ label: event.name, value: event.id })),
    [data.events],
  );
  const participantOptions = useMemo(
    () => [
      { label: 'You', value: 'me' },
      ...eventMemberIds.map((memberId) => ({
        label: data.members.find((member) => member.id === memberId)?.displayName ?? 'Member',
        value: memberId,
      })),
    ],
    [data.members, eventMemberIds],
  );

  const obligations = buildEqualSplitObligations({
    expenseId: expense?.id ?? createId('expense_preview'),
    eventId: selectedEventId,
    payerId,
    amount: Number(amount) || 0,
    currency,
    participantIds,
  });

  if (data.loading) {
    return <LoadingState />;
  }

  async function save() {
    const input = {
      eventId: selectedEventId,
      payerId,
      amount: Number(amount),
      currency,
      title,
      notes,
      expenseDate,
      participantIds,
      tags: splitTags(tags),
      status,
      verificationStatus,
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
          disabled={!selectedEventId || !title.trim() || Number(amount) <= 0 || participantIds.length === 0}
        />
      }>
      <PageHeader
        eyebrow="Shared expense"
        title={expense ? 'Edit expense' : 'Add expense'}
        subtitle="Default event flow: one payer, equal split, custom participant selection."
      />

      <Card>
        <SelectChips label="Event" value={selectedEventId} options={eventOptions} onChange={setSelectedEventId} />
        <SelectChips label="Payer" value={payerId} options={participantOptions} onChange={setPayerId} />
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
        <MultiSelectChips label="Split participants" values={participantIds} options={participantOptions} onChange={setParticipantIds} />
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
        <Text style={styles.label}>Equal split preview</Text>
        {obligations.length > 0 ? (
          obligations.map((obligation) => (
            <View key={obligation.id} style={styles.previewRow}>
              <Text style={styles.previewText}>
                {participantName(obligation.fromParticipantId, data.members)} owes {participantName(obligation.toParticipantId, data.members)}
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
});
