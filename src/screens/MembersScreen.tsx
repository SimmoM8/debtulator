import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MemberRow } from '@/src/components/EntityRows';
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
import { spacing } from '@/src/constants/design';
import { filterMembers } from '@/src/services/filters';
import { useAppData } from '@/src/state/AppDataProvider';
import type { MemberFilters } from '@/src/types/models';

const defaultFilters: MemberFilters = {
  query: '',
  tag: null,
  balanceMode: 'all',
  archivedMode: 'active',
  sort: 'name_asc',
};

export function MembersScreen() {
  const data = useAppData();
  const [filters, setFilters] = useState<MemberFilters>(defaultFilters);

  const tagOptions = useMemo(
    () => [{ label: 'All tags', value: 'all' }, ...data.tags.map((tag) => ({ label: tag.name, value: tag.name }))],
    [data.tags],
  );
  const members = useMemo(
    () => filterMembers(data.members, data.memberBalances, filters),
    [data.memberBalances, data.members, filters],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="People"
        title="Members"
        subtitle="Manual contacts can stay local or be linked to real Debtulator users."
        action={<Button title="Add" icon="person-add" onPress={() => router.push('/member/form')} />}
      />

      <Card>
        <SearchField
          value={filters.query}
          onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
          placeholder="Search names, tags, email, phone"
        />
        <View style={styles.filterGrid}>
          <SelectChips
            label="Tags"
            value={filters.tag ?? 'all'}
            options={tagOptions}
            onChange={(value) => setFilters((current) => ({ ...current, tag: value === 'all' ? null : value }))}
          />
          <SelectChips
            label="Balance"
            value={filters.balanceMode}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Has balance', value: 'has_balance' },
            ]}
            onChange={(balanceMode) => setFilters((current) => ({ ...current, balanceMode }))}
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
            label="Sort"
            value={filters.sort}
            options={[
              { label: 'Name', value: 'name_asc' },
              { label: 'Balance', value: 'balance_desc' },
            ]}
            onChange={(sort) => setFilters((current) => ({ ...current, sort }))}
          />
        </View>
      </Card>

      <SectionTitle title="Active member balances" subtitle="Native currency balances stay separate." />
      <Card>
        {members.length > 0 ? (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              balance={data.memberBalances[member.id] ?? {}}
              settings={data.settings}
              currencyRates={data.currencyRates}
            />
          ))
        ) : (
          <EmptyState title="No members match" body="Adjust filters or add a new local member." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterGrid: {
    gap: spacing.md,
  },
});
