import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { EventRow } from '@/src/components/EntityRows';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Screen,
  SearchField,
  SectionTitle,
  SelectChips,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { filterEvents } from '@/src/services/filters';
import { explainEventSettlement } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import type { EventFilters, MoneyMap } from '@/src/types/models';

const defaultFilters: EventFilters = {
  query: '',
  status: 'all',
  tag: null,
  archivedMode: 'active',
  currency: 'all',
  sort: 'date_desc',
};

export function EventsScreen() {
  const data = useAppData();
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);

  const eventBalances = useMemo(() => {
    const balances: Record<string, MoneyMap> = {};
    for (const event of data.events) {
      balances[event.id] = explainEventSettlement(event.id, data.ledgerEntries).participantNets.me ?? {};
    }
    return balances;
  }, [data.events, data.ledgerEntries]);

  const events = useMemo(() => filterEvents(data.events, eventBalances, filters), [data.events, eventBalances, filters]);
  const tagOptions = useMemo(
    () => [{ label: 'All tags', value: 'all' }, ...data.tags.map((tag) => ({ label: tag.name, value: tag.name }))],
    [data.tags],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Groups"
        title="Events"
        subtitle="Structured containers for trips, households, family events, and shared expense groups."
        action={<Button title="Add event" icon="people" onPress={() => router.push('/event/form')} />}
      />

      <Card>
        <SearchField
          value={filters.query}
          onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
          placeholder="Search events, notes, tags"
        />
        <SelectChips
          label="Status"
          value={filters.status}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Planning', value: 'planning' },
            { label: 'Active', value: 'active' },
            { label: 'Finalising', value: 'finalising' },
            { label: 'Settled', value: 'settled' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={(status) => setFilters((current) => ({ ...current, status }))}
        />
        <SelectChips
          label="Currency"
          value={filters.currency}
          options={[{ label: 'All', value: 'all' }, ...CURRENCIES.map((currency) => ({ label: currency, value: currency }))]}
          onChange={(currency) => setFilters((current) => ({ ...current, currency }))}
        />
        <SelectChips
          label="Archive"
          value={filters.archivedMode}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Archived', value: 'archived' },
            { label: 'All', value: 'all' },
          ]}
          onChange={(archivedMode) => setFilters((current) => ({ ...current, archivedMode }))}
        />
        <SelectChips
          label="Tags"
          value={filters.tag ?? 'all'}
          options={tagOptions}
          onChange={(value) => setFilters((current) => ({ ...current, tag: value === 'all' ? null : value }))}
        />
        <SelectChips
          label="Sort"
          value={filters.sort}
          options={[
            { label: 'Updated', value: 'date_desc' },
            { label: 'Oldest', value: 'date_asc' },
            { label: 'Name', value: 'name_asc' },
            { label: 'Balance', value: 'balance_desc' },
          ]}
          onChange={(sort) => setFilters((current) => ({ ...current, sort }))}
        />
      </Card>

      <SectionTitle title="Events and groups" subtitle="Event balances are calculated by currency." />
      <Card>
        <View>
          {events.length > 0 ? (
            events.map((event) => {
              const explanation = explainEventSettlement(event.id, data.ledgerEntries);
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  memberCount={data.eventMembers.filter((eventMember) => eventMember.eventId === event.id).length}
                  balance={eventBalances[event.id] ?? {}}
                  settings={data.settings}
                  currencyRates={data.currencyRates}
                  unsettled={explanation.suggestions.length > 0}
                />
              );
            })
          ) : (
            <EmptyState title="No events match" body="Create a structured group for shared expenses." />
          )}
        </View>
      </Card>
    </Screen>
  );
}
