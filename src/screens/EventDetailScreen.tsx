import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DebtRow } from '@/src/components/EntityRows';
import { Badge, StatusBadge, TagChips } from '@/src/components/ui/Badges';
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
import { palette, radii, spacing } from '@/src/constants/design';
import { findDuplicateWarnings } from '@/src/services/duplicates';
import { entriesForEvent, explainEventSettlement, participantName } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import type { EventStatus } from '@/src/types/models';
import { formatMoney, formatMoneyMap } from '@/src/utils/money';

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const event = data.events.find((item) => item.id === id);

  const eventMemberIds = useMemo(
    () => data.eventMembers.filter((eventMember) => eventMember.eventId === id).map((eventMember) => eventMember.memberId),
    [data.eventMembers, id],
  );
  const eventEntries = useMemo(() => (event ? entriesForEvent(event.id, data.ledgerEntries) : []), [data.ledgerEntries, event]);
  const explanation = useMemo(
    () => (event ? explainEventSettlement(event.id, data.ledgerEntries) : null),
    [data.ledgerEntries, event],
  );
  const duplicateWarnings = useMemo(
    () => (event ? findDuplicateWarnings(event, data.eventMembers, data.members) : []),
    [data.eventMembers, data.members, event],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  if (!event || !explanation) {
    return (
      <Screen>
        <EmptyState title="Event not found" body="This event may have been archived or removed." />
      </Screen>
    );
  }

  const currentEvent = event;

  async function toggleMember(memberId: string) {
    const nextIds = eventMemberIds.includes(memberId)
      ? eventMemberIds.filter((id) => id !== memberId)
      : [...eventMemberIds, memberId];
    await data.setEventMembers(currentEvent.id, nextIds);
  }

  async function updateStatus(status: EventStatus) {
    await data.updateEvent(currentEvent.id, {
      status,
      archived: status === 'archived' ? true : currentEvent.archived,
    });
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Event detail"
        title={event.name}
        subtitle={event.notes ?? 'Shared expenses, balances, and settlements.'}
        action={<IconButton icon="create-outline" label="Edit event" onPress={() => router.push({ pathname: '/event/form', params: { id: event.id } })} />}
      />

      <Card tone="mint">
        <View style={styles.eventTop}>
          <View style={styles.flexOne}>
            <StatusBadge status={event.status} />
            <Text style={styles.label}>Your event balance</Text>
            <BalanceStack
              balances={explanation.participantNets.me ?? {}}
              settings={data.settings}
              currencyRates={data.currencyRates}
              empty="No personal balance"
            />
          </View>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeNumber}>{eventMemberIds.length}</Text>
            <Text style={styles.badgeLabel}>members</Text>
          </View>
        </View>
        <TagChips tags={event.tags} />
        <View style={styles.actionRow}>
          <Button title="Add expense" icon="cart" onPress={() => router.push({ pathname: '/expense/form', params: { eventId: event.id } })} />
          <Button title="Add debt" icon="receipt" variant="secondary" onPress={() => router.push({ pathname: '/debt/form', params: { eventId: event.id } })} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Event members" subtitle="Tap members to add or remove them from this structured event." />
        <View style={styles.memberWrap}>
          <View style={[styles.memberChip, styles.memberChipSelected]}>
            <Text style={styles.memberChipSelectedText}>You</Text>
          </View>
          {data.members
            .filter((member) => !member.archived)
            .map((member) => {
              const selected = eventMemberIds.includes(member.id);
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggleMember(member.id)}
                  style={[styles.memberChip, selected && styles.memberChipSelected]}>
                  <Text style={[styles.memberChipText, selected && styles.memberChipSelectedText]}>{member.displayName}</Text>
                </Pressable>
              );
            })}
        </View>
      </Card>

      {duplicateWarnings.length > 0 ? (
        <Card tone="amber">
          <SectionTitle title="Possible duplicate members" subtitle="Stage 1 warns only; it does not auto-merge local contacts." />
          {duplicateWarnings.map((warning) => (
            <View key={warning.key} style={styles.warningRow}>
              <Text style={styles.body}>{warning.message}</Text>
              <Button
                title="Ignore warning"
                icon="close"
                variant="secondary"
                onPress={() =>
                  data.updateEvent(event.id, {
                    ignoredDuplicateKeys: [...event.ignoredDuplicateKeys, warning.key],
                  })
                }
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Settlement suggestions" subtitle="Fewest-payment suggestions are calculated separately by currency." />
        {explanation.suggestions.length > 0 ? (
          explanation.suggestions.map((suggestion) => (
            <View key={suggestion.id} style={styles.settlementRow}>
              <Text style={styles.settlementText}>
                {participantName(suggestion.fromId, data.members)} pays {participantName(suggestion.toId, data.members)}
              </Text>
              <Text style={styles.money}>{formatMoney(suggestion.amount, suggestion.currency)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.body}>No settlement suggestions with the default included records.</Text>
        )}
      </Card>

      <Card>
        <SectionTitle title="Calculation explanation" subtitle="Default settlement excludes archived, settled, rejected, disputed, and pending rows." />
        <Text style={styles.label}>Participant net balances</Text>
        {Object.entries(explanation.participantNets).map(([participantId, moneyMap]) => (
          <View key={participantId} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{participantName(participantId, data.members)}</Text>
            <Text style={styles.infoValue}>{formatMoneyMap(moneyMap)}</Text>
          </View>
        ))}
        <View style={styles.countLine}>
          <Badge label={`${explanation.includedEntries.length} included`} tone="positive" />
          <Badge label={`${explanation.excludedEntries.length} excluded`} tone="neutral" />
        </View>
      </Card>

      <SectionTitle title="Event ledger" subtitle="Manual debts and generated shared-expense obligations." />
      <Card>
        {eventEntries.length > 0 ? (
          eventEntries.map((entry) => (
            <DebtRow key={entry.id} entry={entry} members={data.members} event={event} />
          ))
        ) : (
          <EmptyState title="No event records" body="Add a shared expense or manual event debt." />
        )}
      </Card>

      <Card>
        <SectionTitle title="Local event controls" subtitle="Status changes are local in Stage 1." />
        <View style={styles.actionRow}>
          <Button title="Planning" variant="secondary" icon="calendar" onPress={() => updateStatus('planning')} />
          <Button title="Active" variant="secondary" icon="play" onPress={() => updateStatus('active')} />
          <Button title="Finalising" variant="secondary" icon="hourglass" onPress={() => updateStatus('finalising')} />
          <Button title="Settled" variant="secondary" icon="checkmark-circle" onPress={() => updateStatus('settled')} />
          <Button title="Archive" variant="danger" icon="archive" onPress={() => updateStatus('archived')} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  flexOne: {
    flex: 1,
    gap: spacing.sm,
  },
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeBox: {
    minWidth: 86,
    borderRadius: radii.lg,
    backgroundColor: '#C6E3D9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  badgeNumber: {
    color: palette.brandDark,
    fontSize: 24,
    fontWeight: '900',
  },
  badgeLabel: {
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  memberWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  memberChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  memberChipSelected: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  memberChipText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  memberChipSelectedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  warningRow: {
    gap: spacing.sm,
  },
  body: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  settlementText: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  money: {
    color: palette.brandDark,
    fontSize: 15,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  countLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
