import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EventRow } from '@/src/components/EntityRows';
import {
  Button,
  Card,
  EmptyState,
  FilterSheet,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SearchField,
  SectionTitle,
  SelectChips,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { palette, spacing } from '@/src/constants/design';
import { filterEvents } from '@/src/services/filters';
import { explainEventSettlement } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { EventFilters, MoneyMap } from '@/src/types/models';

const defaultFilters: EventFilters = {
  query: '',
  status: 'all',
  visibility: 'all',
  role: 'all',
  attention: 'all',
  tag: null,
  archivedMode: 'active',
  currency: 'all',
  sort: 'date_desc',
};

export function EventsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const eventBalances = useMemo(() => {
    const balances: Record<string, MoneyMap> = {};
    for (const event of data.events) {
      balances[event.id] = explainEventSettlement(event.id, data.ledgerEntries).participantNets.me ?? {};
    }
    return balances;
  }, [data.events, data.ledgerEntries]);

  const eventAttention = useMemo(() => {
    const pendingInviteEventIds = new Set(data.eventInvites.filter((invite) => invite.status === 'pending').map((invite) => invite.eventId));
    const rejectedOrDisputedEventIds = new Set(
      data.ledgerEntries
        .filter((entry) => entry.eventId && ['rejected', 'disputed'].includes(entry.verificationStatus))
        .map((entry) => entry.eventId as string),
    );
    const unsettledEventIds = new Set(
      data.events
        .filter((event) => explainEventSettlement(event.id, data.ledgerEntries).suggestions.length > 0)
        .map((event) => event.id),
    );
    return { pendingInviteEventIds, rejectedOrDisputedEventIds, unsettledEventIds };
  }, [data.eventInvites, data.events, data.ledgerEntries]);

  const events = useMemo(
    () =>
      filterEvents(data.events, eventBalances, filters, {
        participants: data.eventParticipants,
        userId: auth.identity.authenticatedUserId,
        ...eventAttention,
      }),
    [auth.identity.authenticatedUserId, data.eventParticipants, data.events, eventAttention, eventBalances, filters],
  );
  const tagOptions = useMemo(
    () => [{ label: 'All tags', value: 'all' }, ...data.tags.map((tag) => ({ label: tag.name, value: tag.name }))],
    [data.tags],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  const sharedCount = data.events.filter((event) => event.visibility === 'shared' && !event.archived).length;
  const unsettledCount = eventAttention.unsettledEventIds.size;
  const activeFilterCount = countActiveEventFilters(filters);

  function applyQuickFilter(mode: 'active' | 'shared' | 'unsettled' | 'settled') {
    setFilters((current) => ({
      ...current,
      status: mode === 'settled' ? 'settled' : 'all',
      visibility: mode === 'shared' ? 'shared' : 'all',
      attention: mode === 'unsettled' ? 'unsettled' : 'all',
      archivedMode: 'active',
    }));
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Groups"
        title="Shared"
        subtitle="Trips, households, family events, and shared expense groups in one calm place."
        action={<Button title="Add event" icon="people" onPress={() => router.push('/event/form')} />}
      />

      <View style={styles.searchBlock}>
        <View style={styles.searchLine}>
          <View style={styles.searchFlex}>
            <SearchField
              value={filters.query}
              onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
              placeholder="Search groups"
            />
          </View>
          <IconButton icon="options-outline" label="Open filters" onPress={() => setFiltersOpen(true)} />
        </View>
        <View style={styles.quickFilters}>
          <QuickFilter label="Active" active={filters.archivedMode === 'active' && filters.visibility === 'all' && filters.attention === 'all' && filters.status === 'all'} onPress={() => applyQuickFilter('active')} />
          <QuickFilter label="Shared" active={filters.visibility === 'shared'} onPress={() => applyQuickFilter('shared')} />
          <QuickFilter label="Unsettled" active={filters.attention === 'unsettled'} onPress={() => applyQuickFilter('unsettled')} />
          <QuickFilter label="Settled" active={filters.status === 'settled'} onPress={() => applyQuickFilter('settled')} />
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryValue}>{events.length}</Text>
          <Text style={styles.summaryLabel}>Shown</Text>
        </View>
        <View>
          <Text style={styles.summaryValue}>{sharedCount}</Text>
          <Text style={styles.summaryLabel}>Shared</Text>
        </View>
        <View>
          <Text style={styles.summaryValue}>{unsettledCount}</Text>
          <Text style={styles.summaryLabel}>Unsettled</Text>
        </View>
      </Card>

      <SectionTitle
        title="Events and groups"
        subtitle="Event balances are calculated by currency."
        action={activeFilterCount ? <Button title="Clear" variant="ghost" onPress={() => setFilters({ ...defaultFilters, query: filters.query })} /> : undefined}
      />
      <Card>
        <View>
          {events.length > 0 ? (
            events.map((event) => {
              const explanation = explainEventSettlement(event.id, data.ledgerEntries);
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  memberCount={
                    event.visibility === 'shared'
                      ? data.sharedEventMembers.filter(
                          (eventMember) => eventMember.eventId === event.id && eventMember.status !== 'merged',
                        ).length
                      : data.eventMembers.filter((eventMember) => eventMember.eventId === event.id).length + 1
                  }
                  balance={eventBalances[event.id] ?? {}}
                  settings={data.settings}
                  currencyRates={data.currencyRates}
                  unsettled={explanation.suggestions.length > 0}
                />
              );
            })
          ) : (
            <EmptyState
              title="No groups found"
              body="Try another filter or create a group for shared expenses."
              action={<Button title="Add event" icon="people" onPress={() => router.push('/event/form')} />}
            />
          )}
        </View>
      </Card>

      <FilterSheet
        visible={filtersOpen}
        title="Filter groups"
        subtitle="Advanced controls stay tucked away until you need them."
        onClose={() => setFiltersOpen(false)}>
        <SelectChips
          label="Visibility"
          value={filters.visibility}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Private', value: 'private' },
            { label: 'Shared', value: 'shared' },
          ]}
          onChange={(visibility) => setFilters((current) => ({ ...current, visibility }))}
        />
        <SelectChips
          label="Role"
          value={filters.role}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Owner', value: 'owner' },
            { label: 'Admin', value: 'admin' },
            { label: 'Member', value: 'member' },
            { label: 'Viewer', value: 'viewer' },
          ]}
          onChange={(role) => setFilters((current) => ({ ...current, role }))}
        />
        <SelectChips
          label="Attention"
          value={filters.attention}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Pending invites', value: 'pending_invites' },
            { label: 'Rejected/disputed', value: 'rejected_or_disputed' },
            { label: 'Unsettled', value: 'unsettled' },
          ]}
          onChange={(attention) => setFilters((current) => ({ ...current, attention }))}
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
        <View style={styles.sheetActions}>
          <Button title="Reset filters" variant="secondary" onPress={() => setFilters({ ...defaultFilters, query: filters.query })} />
          <Button title="Show results" onPress={() => setFiltersOpen(false)} />
        </View>
      </FilterSheet>
    </Screen>
  );
}

function QuickFilter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.quickFilter, active && styles.quickFilterActive]}>
      <Text style={[styles.quickFilterText, active && styles.quickFilterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function countActiveEventFilters(filters: EventFilters) {
  return Object.entries(filters).filter(([key, value]) => key !== 'query' && value !== defaultFilters[key as keyof EventFilters]).length;
}

const styles = StyleSheet.create({
  searchBlock: {
    gap: spacing.md,
  },
  searchLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchFlex: {
    flex: 1,
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickFilter: {
    minHeight: 32,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(55,48,163,0.12)',
  },
  quickFilterActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  quickFilterText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
