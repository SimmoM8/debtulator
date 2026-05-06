import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '@/src/constants/design';
import { entryDirectionText } from '@/src/services/ledger';
import type {
  AppSettings,
  CurrencyRate,
  Event,
  LedgerEntry,
  Member,
  MoneyMap,
  SharedEventMember,
} from '@/src/types/models';
import { formatMoney } from '@/src/utils/money';
import { initials } from '@/src/utils/text';
import { BalanceStack } from '@/src/components/ui/Money';
import { LinkStatusBadge, StatusBadge, TagChips, VerificationBadge, VisibilityBadge } from '@/src/components/ui/Badges';

export function MemberRow({
  member,
  balance,
  settings,
  currencyRates,
}: {
  member: Member;
  balance: MoneyMap;
  settings: AppSettings;
  currencyRates: CurrencyRate[];
}) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/member/[id]', params: { id: member.id } })} style={styles.row}>
      <Avatar label={member.displayName} />
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{member.displayName}</Text>
          <LinkStatusBadge status={member.linkStatus} />
        </View>
        {member.linkedProfileDisplayName ? (
          <Text style={styles.rowMeta}>Linked to {member.linkedProfileDisplayName}</Text>
        ) : null}
        <TagChips tags={member.tags} limit={3} />
      </View>
      <BalanceStack balances={balance} settings={settings} currencyRates={currencyRates} align="right" />
    </Pressable>
  );
}

export function DebtRow({
  entry,
  members,
  sharedEventMembers = [],
  event,
}: {
  entry: LedgerEntry;
  members: Member[];
  sharedEventMembers?: SharedEventMember[];
  event?: Event;
}) {
  const rejected = entry.verificationStatus === 'rejected' || entry.verificationStatus === 'disputed';
  const member = [entry.fromId, entry.toId]
    .filter((participantId) => participantId !== 'me')
    .map((participantId) => members.find((item) => item.id === participantId))
    .find(Boolean);
  return (
    <Pressable
      onPress={() =>
        entry.kind === 'simple_debt'
          ? router.push({ pathname: '/debt/[id]', params: { id: entry.sourceId } })
          : entry.kind === 'event_direct_debt' && entry.eventId
            ? router.push({ pathname: '/event/[id]', params: { id: entry.eventId } })
            : router.push({ pathname: '/expense/[id]', params: { id: entry.expenseId ?? entry.sourceId } })
      }
      style={[styles.ledgerRow, rejected && styles.rejectedRow]}>
      <View style={styles.rowIcon}>
        <Ionicons name={entry.kind === 'simple_debt' ? 'receipt-outline' : 'git-network-outline'} size={18} color={palette.brand} />
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{entry.title}</Text>
          <Text style={styles.dateText}>{entry.date}</Text>
        </View>
        <Text style={styles.rowSubtitle}>{entryDirectionText(entry, members, sharedEventMembers)}</Text>
        {event ? <Text style={styles.rowMeta}>{event.name}</Text> : null}
        <TagChips tags={entry.tags} limit={3} />
        <View style={styles.badgeLine}>
          <StatusBadge status={entry.status} />
          <VerificationBadge status={entry.verificationStatus} />
          <VisibilityBadge visibility={entry.visibility} />
          {member ? <LinkStatusBadge status={member.linkStatus} /> : null}
          <Text style={styles.rowMeta}>{entry.paymentStatus.replaceAll('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.amountBlock}>
        <Text style={styles.amountText}>{formatMoney(entry.remainingAmount, entry.currency)}</Text>
        {entry.amountPaid > 0 ? <Text style={styles.kindText}>paid {formatMoney(entry.amountPaid, entry.currency)}</Text> : null}
        {entry.dueDate ? <Text style={styles.kindText}>due {entry.dueDate}</Text> : null}
        <Text style={styles.kindText}>{entry.kind === 'simple_debt' ? 'Debt' : entry.kind === 'event_direct_debt' ? 'Event debt' : 'Split'}</Text>
      </View>
    </Pressable>
  );
}

export function EventRow({
  event,
  memberCount,
  balance,
  settings,
  currencyRates,
  unsettled,
}: {
  event: Event;
  memberCount: number;
  balance: MoneyMap;
  settings: AppSettings;
  currencyRates: CurrencyRate[];
  unsettled: boolean;
}) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })} style={styles.row}>
      <View style={[styles.eventMark, unsettled ? styles.eventMarkHot : null]}>
        <Ionicons name="people" size={18} color={unsettled ? palette.negative : palette.brand} />
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{event.name}</Text>
          <StatusBadge status={event.status} />
        </View>
        <Text style={styles.rowSubtitle}>
          {memberCount} members · {event.defaultCurrency} · {event.visibility === 'shared' ? 'Shared event' : 'Private event'}
        </Text>
        <TagChips tags={event.tags} limit={3} />
      </View>
      <BalanceStack balances={balance} settings={settings} currencyRates={currencyRates} align="right" />
    </Pressable>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  rejectedRow: {
    backgroundColor: palette.negativeSoft,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderBottomWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: palette.brandSoft,
    borderWidth: 1,
    borderColor: '#BFDCD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.brandDark,
    fontSize: 14,
    fontWeight: '900',
  },
  eventMark: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: palette.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMarkHot: {
    backgroundColor: palette.negativeSoft,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  rowSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    color: palette.brand,
    fontSize: 12,
    fontWeight: '800',
  },
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  amountText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  kindText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateText: {
    color: palette.faint,
    fontSize: 12,
    fontWeight: '700',
  },
});
