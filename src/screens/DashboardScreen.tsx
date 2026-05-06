import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EventRow, DebtRow, MemberRow } from '@/src/components/EntityRows';
import { Badge } from '@/src/components/ui/Badges';
import { BalanceStack } from '@/src/components/ui/Money';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  ResponsiveGrid,
  Screen,
  SectionTitle,
} from '@/src/components/ui/Primitives';
import { palette, radii, spacing } from '@/src/constants/design';
import { explainEventSettlement } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import { sumMoneyMap } from '@/src/utils/money';

export function DashboardScreen() {
  const data = useAppData();
  const auth = useAuth();

  const activeEvents = data.events.filter((event) => !event.archived && event.status !== 'settled').slice(0, 3);
  const recentEntries = data.ledgerEntries.slice(0, 5);
  const attentionEntries = data.ledgerEntries
    .filter((entry) => ['pending', 'rejected', 'disputed'].includes(entry.verificationStatus))
    .slice(0, 4);

  const topMembers = useMemo(
    () =>
      data.members
        .filter((member) => !member.archived)
        .sort((first, second) => sumMoneyMap(data.memberBalances[second.id] ?? {}) - sumMoneyMap(data.memberBalances[first.id] ?? {}))
        .slice(0, 4),
    [data.memberBalances, data.members],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Local-first ledger"
        title="Debtulator"
        subtitle={
          auth.user
            ? `Signed in as ${auth.identity.displayName}. Local debts remain private until shared.`
            : 'Track debts locally without an account. Sign in only when you want linking and verification.'
        }
        action={<Button title={auth.user ? 'Requests' : 'Sign in'} icon={auth.user ? 'notifications' : 'person-circle'} onPress={() => router.push(auth.user ? '/requests' : '/auth')} />}
      />

      <Card tone="mint" style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroLabel}>Net balance</Text>
            <BalanceStack
              balances={data.personalTotals.net}
              settings={data.settings}
              currencyRates={data.currencyRates}
              empty="Settled up"
            />
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="wallet" size={26} color={palette.brandDark} />
          </View>
        </View>
        <View style={styles.badgeLine}>
          <Badge label={auth.user ? 'signed in' : 'local-only'} tone={auth.user ? 'positive' : 'neutral'} />
          <Badge label="private by default" tone="blue" />
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile title="Owed to you" balances={data.personalTotals.owedToMe} tone="positive" />
          <SummaryTile title="You owe" balances={data.personalTotals.iOwe} tone="negative" />
        </View>
      </Card>

      <View style={styles.quickActions}>
        <QuickAction label="Add debt" icon="receipt" onPress={() => router.push('/debt/form')} />
        <QuickAction label="Add member" icon="person-add" onPress={() => router.push('/member/form')} />
        <QuickAction label="Add event" icon="people" onPress={() => router.push('/event/form')} />
        <QuickAction label="Add expense" icon="cart" onPress={() => router.push('/expense/form')} />
        <QuickAction label="Requests" icon="notifications" onPress={() => router.push('/requests')} />
      </View>

      <ResponsiveGrid>
        <View style={styles.gridItem}>
          <SectionTitle title="Recent ledger" subtitle="Simple debts and generated split obligations" />
          <Card>
            {recentEntries.length > 0 ? (
              recentEntries.map((entry) => (
                <DebtRow
                  key={entry.id}
                  entry={entry}
                  members={data.members}
                  event={entry.eventId ? data.events.find((event) => event.id === entry.eventId) : undefined}
                />
              ))
            ) : (
              <EmptyState title="No records yet" body="Add a debt or event expense to start your ledger." />
            )}
          </Card>
        </View>

        <View style={styles.gridItem}>
          <SectionTitle title="Needs attention" subtitle="Pending, rejected, and disputed local records" />
          <Card>
            {attentionEntries.length > 0 ? (
              attentionEntries.map((entry) => (
                <DebtRow
                  key={entry.id}
                  entry={entry}
                  members={data.members}
                  event={entry.eventId ? data.events.find((event) => event.id === entry.eventId) : undefined}
                />
              ))
            ) : (
              <EmptyState title="Nothing flagged" body="Rejected and disputed records stay visible here." />
            )}
          </Card>
        </View>
      </ResponsiveGrid>

      <ResponsiveGrid>
        <View style={styles.gridItem}>
          <SectionTitle title="Top members" subtitle="Largest active balances" />
          <Card>
            {topMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                balance={data.memberBalances[member.id] ?? {}}
                settings={data.settings}
                currencyRates={data.currencyRates}
              />
            ))}
          </Card>
        </View>

        <View style={styles.gridItem}>
          <SectionTitle title="Active events" subtitle="Event-level balances and settlement hints" />
          <Card>
            {activeEvents.map((event) => {
              const explanation = explainEventSettlement(event.id, data.ledgerEntries);
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  memberCount={data.eventMembers.filter((eventMember) => eventMember.eventId === event.id).length}
                  balance={explanation.participantNets.me ?? {}}
                  settings={data.settings}
                  currencyRates={data.currencyRates}
                  unsettled={explanation.suggestions.length > 0}
                />
              );
            })}
          </Card>
        </View>
      </ResponsiveGrid>

      <SectionTitle title="Recent activity" subtitle="Verification and linking changes" />
      <Card>
        {data.activityLogs.length > 0 ? (
          data.activityLogs.slice(0, 6).map((activity) => (
            <View key={activity.id} style={styles.activityRow}>
              <Text style={styles.quickText}>{activity.action.replaceAll('_', ' ')}</Text>
              <Text style={styles.activityMeta}>{new Date(activity.createdAt).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <EmptyState title="No activity yet" body="Linking and verification events will appear here." />
        )}
      </Card>
    </Screen>
  );
}

function SummaryTile({
  title,
  balances,
  tone,
}: {
  title: string;
  balances: Record<string, number | undefined>;
  tone: 'positive' | 'negative';
}) {
  const lines = Object.entries(balances).filter(([, amount]) => Math.abs(amount ?? 0) > 0.005);
  return (
    <View style={styles.summaryTile}>
      <Badge label={title} tone={tone} />
      {lines.length === 0 ? (
        <Text style={styles.summaryEmpty}>None</Text>
      ) : (
        lines.map(([currency, amount]) => (
          <Text key={currency} style={[styles.summaryAmount, tone === 'positive' ? styles.positive : styles.negative]}>
            {currency} {Math.abs(amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        ))
      )}
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <Ionicons name={icon} size={19} color={palette.brand} />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  heroTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  heroLabel: {
    color: palette.brandDark,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: '#C6E3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryTile: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: '#D2E2DB',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  summaryEmpty: {
    color: palette.faint,
    fontWeight: '800',
  },
  positive: {
    color: palette.positive,
  },
  negative: {
    color: palette.negative,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickAction: {
    minHeight: 48,
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  gridItem: {
    flex: 1,
    minWidth: 320,
    gap: spacing.md,
  },
  activityRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  activityMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
