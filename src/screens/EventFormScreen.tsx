import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';

import {
  Button,
  Card,
  LoadingState,
  MultiSelectChips,
  PageHeader,
  Screen,
  SelectChips,
  TextField,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { useAppData } from '@/src/state/AppDataProvider';
import type { CurrencyCode, EventStatus } from '@/src/types/models';

export function EventFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const event = data.events.find((item) => item.id === id);
  const currentMemberIds = data.eventMembers
    .filter((eventMember) => eventMember.eventId === event?.id)
    .map((eventMember) => eventMember.memberId);

  const [name, setName] = useState(event?.name ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(event?.defaultCurrency ?? data.settings.baseCurrency);
  const [tags, setTags] = useState(event?.tags.join(', ') ?? '');
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'active');
  const [memberIds, setMemberIds] = useState<string[]>(currentMemberIds);

  const memberOptions = useMemo(
    () => data.members.filter((member) => !member.archived).map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function save() {
    const input = {
      name,
      notes,
      defaultCurrency,
      tags: splitTags(tags),
      status,
      memberIds,
    };

    if (event) {
      await data.updateEvent(event.id, input);
    } else {
      await data.createEvent(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={event ? 'Save event' : 'Create event'}
          icon="checkmark"
          onPress={save}
          disabled={!name.trim()}
        />
      }>
      <PageHeader
        eyebrow="Event"
        title={event ? 'Edit event' : 'Add event'}
        subtitle="Events are structured groups for expenses and settlements, not tags."
      />

      <Card>
        <TextField label="Event name" value={name} onChangeText={setName} placeholder="Ski Trip Sweden" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <SelectChips
          label="Default currency"
          value={defaultCurrency}
          options={CURRENCIES.map((currency) => ({ label: currency, value: currency }))}
          onChange={setDefaultCurrency}
        />
        <TextField label="Tags" value={tags} onChangeText={setTags} placeholder="Travel, Food" />
        <SelectChips
          label="Status"
          value={status}
          options={[
            { label: 'Planning', value: 'planning' },
            { label: 'Active', value: 'active' },
            { label: 'Finalising', value: 'finalising' },
            { label: 'Settled', value: 'settled' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={setStatus}
        />
        <MultiSelectChips label="Members" values={memberIds} options={memberOptions} onChange={setMemberIds} />
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
