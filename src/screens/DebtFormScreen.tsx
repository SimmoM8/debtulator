import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Screen,
  SelectChips,
  TextField,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { CurrencyCode, DebtDirection, DebtStatus, VerificationStatus } from '@/src/types/models';
import { todayIsoDate } from '@/src/utils/id';

export function DebtFormScreen() {
  const { id, memberId, eventId } = useLocalSearchParams<{ id?: string; memberId?: string; eventId?: string }>();
  const data = useAppData();
  const auth = useAuth();
  const debt = data.debts.find((item) => item.id === id);
  const selectedEvent = data.events.find((event) => event.id === (debt?.eventId ?? eventId));
  const isSharedEventDebt = !debt && selectedEvent?.visibility === 'shared';
  const sharedEventMembers = data.sharedEventMembers.filter(
    (eventMember) => eventMember.eventId === selectedEvent?.id && eventMember.status !== 'archived' && eventMember.status !== 'merged',
  );
  const currentEventMember = sharedEventMembers.find((member) => member.linkedUserId === auth.identity.authenticatedUserId);

  const [selectedMemberId, setSelectedMemberId] = useState(debt?.memberId ?? memberId ?? data.members[0]?.id ?? '');
  const [debtorEventMemberId, setDebtorEventMemberId] = useState(currentEventMember?.id ?? sharedEventMembers[0]?.id ?? '');
  const [creditorEventMemberId, setCreditorEventMemberId] = useState(sharedEventMembers.find((member) => member.id !== debtorEventMemberId)?.id ?? '');
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? 'they_owe_me');
  const [amount, setAmount] = useState(debt ? String(debt.amount) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(debt?.currency ?? 'SEK');
  const [title, setTitle] = useState(debt?.title ?? '');
  const [notes, setNotes] = useState(debt?.notes ?? '');
  const [sharedNotes, setSharedNotes] = useState(debt?.sharedNotes ?? '');
  const [debtDate, setDebtDate] = useState(debt?.debtDate ?? todayIsoDate());
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? '');
  const [tags, setTags] = useState(debt?.tags.join(', ') ?? '');
  const [selectedEventId, setSelectedEventId] = useState(debt?.eventId ?? eventId ?? 'none');
  const [status, setStatus] = useState<DebtStatus>(debt?.status ?? 'active');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(debt?.verificationStatus ?? 'local_only');
  const [visibility, setVisibility] = useState(debt?.visibility ?? 'private');

  const memberOptions = useMemo(
    () => data.members.filter((member) => !member.archived).map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );
  const eventOptions = useMemo(
    () => [
      { label: 'No event', value: 'none' },
      ...data.events.filter((event) => !event.archived).map((event) => ({ label: event.name, value: event.id })),
    ],
    [data.events],
  );
  const eventMemberOptions = useMemo(
    () => sharedEventMembers.map((member) => ({ label: member.displayName, value: member.id })),
    [sharedEventMembers],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    if (isSharedEventDebt && selectedEvent) {
      await data.createEventDebt({
        eventId: selectedEvent.id,
        remoteEventId: selectedEvent.remoteId,
        creatorUserId: auth.identity.authenticatedUserId,
        debtorEventMemberId,
        creditorEventMemberId,
        amount: Number(amount),
        currency,
        title,
        notes,
        debtDate,
        tags: splitTags(tags),
        verificationStatus,
        status,
      });
      router.back();
      return;
    }

    const input = {
      memberId: selectedMemberId,
      direction,
      amount: Number(amount),
      currency,
      title,
      notes,
      sharedNotes,
      debtDate,
      dueDate,
      tags: splitTags(tags),
      eventId: selectedEventId === 'none' ? null : selectedEventId,
      status,
      verificationStatus,
      visibility,
    };

    const financialFieldsChanged =
      debt &&
      debt.verificationStatus === 'verified' &&
      (selectedMemberId !== debt.memberId ||
        direction !== debt.direction ||
        Number(amount) !== debt.amount ||
        currency !== debt.currency ||
        debtDate !== debt.debtDate ||
        (selectedEventId === 'none' ? null : selectedEventId) !== debt.eventId);

    if (financialFieldsChanged) {
      Alert.alert(
        'Verification required again',
        'Changing financial details will require verification again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', style: 'destructive', onPress: () => persist(input) },
        ],
      );
      return;
    }

    await persist(input);
  }

  async function persist(input: Parameters<typeof data.createDebt>[0]) {
    if (debt) {
      await data.updateDebt(debt.id, input);
    } else {
      await data.createDebt(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={debt ? 'Save debt' : 'Create debt'}
          icon="checkmark"
          onPress={save}
          disabled={
            isSharedEventDebt
              ? !debtorEventMemberId || !creditorEventMemberId || debtorEventMemberId === creditorEventMemberId || !title.trim() || Number(amount) <= 0
              : !selectedMemberId || !title.trim() || Number(amount) <= 0
          }
        />
      }>
      <PageHeader
        eyebrow={isSharedEventDebt ? 'Shared event debt' : 'Simple debt'}
        title={debt ? 'Edit debt' : 'Add debt'}
        subtitle={isSharedEventDebt ? 'Direct event debts use event members and participate in event settlement.' : 'Outside events, use clear personal direction: They owe me or I owe them.'}
      />

      <Card>
        {isSharedEventDebt ? (
          <>
            <SelectChips label="Debtor" value={debtorEventMemberId} options={eventMemberOptions} onChange={setDebtorEventMemberId} />
            <SelectChips label="Creditor" value={creditorEventMemberId} options={eventMemberOptions} onChange={setCreditorEventMemberId} />
          </>
        ) : (
          <>
            <SelectChips label="Member" value={selectedMemberId} options={memberOptions} onChange={setSelectedMemberId} />
            <SelectChips
              label="Direction"
              value={direction}
              options={[
                { label: 'They owe me', value: 'they_owe_me' },
                { label: 'I owe them', value: 'i_owe_them' },
              ]}
              onChange={setDirection}
            />
          </>
        )}
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Dinner deposit" />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <SelectChips
          label="Currency"
          value={currency}
          options={CURRENCIES.map((currencyCode) => ({ label: currencyCode, value: currencyCode }))}
          onChange={setCurrency}
        />
        <TextField label="Debt date" value={debtDate} onChangeText={setDebtDate} placeholder="YYYY-MM-DD" />
        <TextField label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="Optional YYYY-MM-DD" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <TextField
          label="Shared notes"
          value={sharedNotes}
          onChangeText={setSharedNotes}
          placeholder="Visible only after requesting verification"
          multiline
        />
        <TextField label="Tags" value={tags} onChangeText={setTags} placeholder="Food, Travel" />
        {!isSharedEventDebt ? <SelectChips label="Event" value={selectedEventId} options={eventOptions} onChange={setSelectedEventId} /> : null}
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
            { label: 'Cancelled', value: 'cancelled' },
          ]}
          onChange={setVerificationStatus}
        />
        {!isSharedEventDebt ? (
          <SelectChips
            label="Visibility"
            value={visibility}
            options={[
              { label: 'Private', value: 'private' },
              { label: 'Shared with member', value: 'shared_with_involved_member' },
              { label: 'Event shared later', value: 'future_event_shared' },
            ]}
            onChange={setVisibility}
          />
        ) : null}
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
