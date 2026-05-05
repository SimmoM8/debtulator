import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DebtRow, EventRow } from '@/src/components/EntityRows';
import { TagChips } from '@/src/components/ui/Badges';
import { BalanceStack } from '@/src/components/ui/Money';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
} from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { entriesForMember, explainEventSettlement } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';

export function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const member = data.members.find((item) => item.id === id);

  const memberEntries = useMemo(
    () => (member ? entriesForMember(member.id, data.ledgerEntries) : []),
    [data.ledgerEntries, member],
  );
  const memberEvents = useMemo(
    () =>
      member
        ? data.eventMembers
            .filter((eventMember) => eventMember.memberId === member.id)
            .map((eventMember) => data.events.find((event) => event.id === eventMember.eventId))
            .filter(Boolean)
        : [],
    [data.eventMembers, data.events, member],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  if (!member) {
    return (
      <Screen>
        <EmptyState title="Member not found" body="This local member may have been archived or removed." />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Member detail"
        title={member.displayName}
        subtitle={member.archived ? 'Archived local member' : 'Manual, unlinked local member'}
        action={<IconButton icon="create-outline" label="Edit member" onPress={() => router.push({ pathname: '/member/form', params: { id: member.id } })} />}
      />

      <Card tone="mint">
        <Text style={styles.label}>Net balance with this member</Text>
        <BalanceStack
          balances={data.memberBalances[member.id] ?? {}}
          settings={data.settings}
          currencyRates={data.currencyRates}
          empty="Settled with this member"
        />
        <TagChips tags={member.tags} />
        {member.email || member.phone ? (
          <View style={styles.metaBlock}>
            {member.email ? <Text style={styles.metaText}>{member.email}</Text> : null}
            {member.phone ? <Text style={styles.metaText}>{member.phone}</Text> : null}
          </View>
        ) : null}
        {member.notes ? <Text style={styles.body}>{member.notes}</Text> : null}
        <View style={styles.actionRow}>
          <Button
            title="Add debt"
            icon="add"
            onPress={() => router.push({ pathname: '/debt/form', params: { memberId: member.id } })}
          />
          <Button
            title={member.archived ? 'Restore' : 'Archive'}
            icon={member.archived ? 'archive-outline' : 'archive'}
            variant="secondary"
            onPress={() => data.updateMember(member.id, { archived: !member.archived })}
          />
        </View>
      </Card>

      <SectionTitle title="Debt history" subtitle="Includes direct debts and event split obligations involving this member." />
      <Card>
        {memberEntries.length > 0 ? (
          memberEntries.map((entry) => (
            <DebtRow
              key={entry.id}
              entry={entry}
              members={data.members}
              event={entry.eventId ? data.events.find((event) => event.id === entry.eventId) : undefined}
            />
          ))
        ) : (
          <EmptyState title="No debt history" body="Add a simple debt or include this member in an event expense." />
        )}
      </Card>

      <SectionTitle title="Events" subtitle="Structured groups this member belongs to." />
      <Card>
        {memberEvents.length > 0 ? (
          memberEvents.map((event) => {
            if (!event) {
              return null;
            }
            const explanation = explainEventSettlement(event.id, data.ledgerEntries);
            return (
              <View key={event.id}>
                <EventRow
                  event={event}
                  memberCount={data.eventMembers.filter((eventMember) => eventMember.eventId === event.id).length}
                  balance={explanation.participantNets[member.id] ?? {}}
                  settings={data.settings}
                  currencyRates={data.currencyRates}
                  unsettled={explanation.suggestions.length > 0}
                />
              </View>
            );
          })
        ) : (
          <EmptyState title="No events yet" body="Add this member to a group or event to split expenses." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metaBlock: {
    gap: spacing.xs,
  },
  metaText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
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
});
