import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DebtRow } from '@/src/components/EntityRows';
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
  TextField,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { spacing } from '@/src/constants/design';
import { filterDebtEntries } from '@/src/services/filters';
import { useAppData } from '@/src/state/AppDataProvider';
import type { DebtFilters } from '@/src/types/models';

const defaultFilters: DebtFilters = {
  query: '',
  memberId: null,
  eventId: null,
  minAmount: '',
  maxAmount: '',
  currency: 'all',
  direction: 'all',
  status: 'all',
  verificationStatus: 'all',
  linkMode: 'all',
  visibility: 'all',
  tag: null,
  kind: 'all',
  sort: 'date_desc',
};

export function DebtsScreen() {
  const data = useAppData();
  const [filters, setFilters] = useState<DebtFilters>(defaultFilters);

  const entries = useMemo(
    () => filterDebtEntries(data.ledgerEntries, data.members, data.events, filters, data.sharedEventMembers),
    [data.events, data.ledgerEntries, data.members, data.sharedEventMembers, filters],
  );

  const memberOptions = useMemo(
    () => [
      { label: 'All members', value: 'all' },
      ...data.members.filter((member) => !member.archived).map((member) => ({ label: member.displayName, value: member.id })),
    ],
    [data.members],
  );

  const eventOptions = useMemo(
    () => [
      { label: 'All events', value: 'all' },
      ...data.events.filter((event) => !event.archived).map((event) => ({ label: event.name, value: event.id })),
    ],
    [data.events],
  );

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
        eyebrow="Ledger"
        title="Debts"
        subtitle="Manual debts and generated obligations from shared expenses."
        action={<Button title="Add debt" icon="add" onPress={() => router.push('/debt/form')} />}
      />

      <Card>
        <SearchField
          value={filters.query}
          onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
          placeholder="Search titles, people, notes, tags"
        />

        <View style={styles.twoColumn}>
          <TextField
            label="Min amount"
            value={filters.minAmount}
            onChangeText={(minAmount) => setFilters((current) => ({ ...current, minAmount }))}
            keyboardType="numeric"
          />
          <TextField
            label="Max amount"
            value={filters.maxAmount}
            onChangeText={(maxAmount) => setFilters((current) => ({ ...current, maxAmount }))}
            keyboardType="numeric"
          />
        </View>

        <SelectChips
          label="Member"
          value={filters.memberId ?? 'all'}
          options={memberOptions}
          onChange={(value) => setFilters((current) => ({ ...current, memberId: value === 'all' ? null : value }))}
        />
        <SelectChips
          label="Event"
          value={filters.eventId ?? 'all'}
          options={eventOptions}
          onChange={(value) => setFilters((current) => ({ ...current, eventId: value === 'all' ? null : value }))}
        />
        <SelectChips
          label="Currency"
          value={filters.currency}
          options={[{ label: 'All', value: 'all' }, ...CURRENCIES.map((currency) => ({ label: currency, value: currency }))]}
          onChange={(currency) => setFilters((current) => ({ ...current, currency }))}
        />
        <SelectChips
          label="Direction"
          value={filters.direction}
          options={[
            { label: 'All', value: 'all' },
            { label: 'They owe me', value: 'they_owe_me' },
            { label: 'I owe them', value: 'i_owe_them' },
          ]}
          onChange={(direction) => setFilters((current) => ({ ...current, direction }))}
        />
        <SelectChips
          label="Type"
          value={filters.kind}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Simple debt', value: 'simple_debt' },
            { label: 'Generated split', value: 'expense_obligation' },
            { label: 'Event debt', value: 'event_direct_debt' },
          ]}
          onChange={(kind) => setFilters((current) => ({ ...current, kind }))}
        />
        <SelectChips
          label="Status"
          value={filters.status}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Settled', value: 'settled' },
            { label: 'Archived', value: 'archived' },
          ]}
          onChange={(status) => setFilters((current) => ({ ...current, status }))}
        />
        <SelectChips
          label="Verification"
          value={filters.verificationStatus}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Local', value: 'local_only' },
            { label: 'Pending', value: 'pending' },
            { label: 'Partially verified', value: 'partially_verified' },
            { label: 'Verified', value: 'verified' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Disputed', value: 'disputed' },
            { label: 'Resolved', value: 'resolved' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
          onChange={(verificationStatus) => setFilters((current) => ({ ...current, verificationStatus }))}
        />
        <SelectChips
          label="Member link"
          value={filters.linkMode}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Linked', value: 'linked' },
            { label: 'Unlinked', value: 'unlinked' },
          ]}
          onChange={(linkMode) => setFilters((current) => ({ ...current, linkMode }))}
        />
        <SelectChips
          label="Visibility"
          value={filters.visibility}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Private', value: 'private' },
            { label: 'Shared', value: 'shared_with_involved_member' },
            { label: 'Shared event', value: 'shared_event' },
            { label: 'Event later', value: 'future_event_shared' },
          ]}
          onChange={(visibility) => setFilters((current) => ({ ...current, visibility }))}
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
            { label: 'Newest', value: 'date_desc' },
            { label: 'Oldest', value: 'date_asc' },
            { label: 'High amount', value: 'amount_desc' },
            { label: 'Low amount', value: 'amount_asc' },
            { label: 'Title', value: 'name_asc' },
          ]}
          onChange={(sort) => setFilters((current) => ({ ...current, sort }))}
        />
      </Card>

      <SectionTitle title="Ledger records" subtitle={`${entries.length} matching rows`} />
      <Card>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <DebtRow
              key={entry.id}
              entry={entry}
              members={data.members}
              sharedEventMembers={data.sharedEventMembers}
              event={entry.eventId ? data.events.find((event) => event.id === entry.eventId) : undefined}
            />
          ))
        ) : (
          <EmptyState title="No ledger rows match" body="Try clearing a filter or adding a new debt." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
