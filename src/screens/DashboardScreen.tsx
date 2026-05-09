import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import {
  ActionTile,
  GlassCard,
  ListRow,
  StatCard,
  StatusPill,
} from "@/src/components/ui/Finance";
import { BalanceStack } from "@/src/components/ui/Money";
import {
  Button,
  EmptyState,
  LoadingState,
  Screen,
  SectionTitle,
  SegmentedControl,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import {
  calculatePersonalTotals,
  entryDirectionText,
} from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
  AppSettings,
  CurrencyRate,
  LedgerEntry,
  Member,
  SharedEventMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type LedgerMode = "personal" | "shared" | "all";

export function DashboardScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [mode, setMode] = useState<LedgerMode>("personal");

  const displayName = auth.identity.displayName?.trim() || "there";
  const firstName = displayName.split(" ")[0] || displayName;

  const scopedEntries = useMemo(() => {
    if (mode === "all") {
      return data.ledgerEntries;
    }

    return data.ledgerEntries.filter((entry) => {
      const shared = entry.visibility.includes("shared");
      return mode === "shared" ? shared : !shared;
    });
  }, [data.ledgerEntries, mode]);

  const totals = useMemo(
    () => calculatePersonalTotals(scopedEntries),
    [scopedEntries],
  );
  const nextActionEntries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return scopedEntries
      .filter((entry) => entry.remainingAmount > 0.005 && entry.dueDate)
      .sort((first, second) =>
        String(first.dueDate).localeCompare(String(second.dueDate)),
      )
      .slice(0, 4)
      .map((entry) => ({
        entry,
        overdue: entry.dueDate ? entry.dueDate < today : false,
      }));
  }, [scopedEntries]);
  const recentActivity = useMemo(
    () => scopedEntries.slice(0, 4),
    [scopedEntries],
  );
  const activeSharedEvents = useMemo(
    () =>
      data.events
        .filter((event) => !event.archived && event.status !== "settled")
        .slice(0, 3),
    [data.events],
  );
  const pendingRequests =
    data.linkRequests.filter((item) => item.status === "pending").length +
    data.eventInvites.filter((item) => item.status === "pending").length +
    data.debtVerifications.filter((item) => item.status === "pending").length;
  const netEstimatedInBase = estimateMoneyMap(
    totals.net,
    data.settings,
    data.currencyRates,
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.identityCopy}>
          <Text style={styles.greeting}>Good morning, {firstName}</Text>
          <Text style={styles.subGreeting}>
            The essentials are here. Everything else stays tucked away.
          </Text>
        </View>
        <AppMenuButton />
      </View>

      <GlassCard tone="lavender" style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleBlock}>
            <StatusPill label="Overview" tone="indigo" />
            <Text style={styles.heroTitle}>Your balance snapshot</Text>
            <Text style={styles.heroSubtitle}>
              Clear totals first, then the actions that matter now.
            </Text>
          </View>
          <StatusPill
            label={data.syncSummary.statusLabel}
            tone={data.syncSummary.hasBlockingProblems ? "amber" : "teal"}
          />
        </View>

        <BalanceStack
          balances={totals.net}
          settings={data.settings}
          currencyRates={data.currencyRates}
          empty="You’re all settled"
        />

        <View style={styles.heroStatusRow}>
          <StatusPill
            label={
              pendingRequests
                ? `${pendingRequests} need action`
                : "Nothing waiting"
            }
            tone={pendingRequests ? "coral" : "lavender"}
          />
        </View>

        <SegmentedControl
          value={mode}
          options={[
            { label: "Personal", value: "personal" },
            { label: "Shared", value: "shared" },
            { label: "All", value: "all" },
          ]}
          onChange={setMode}
        />

        <View style={styles.statsRow}>
          <StatCard
            label="You owe"
            value={moneyLabel(totals.iOwe, data.settings, data.currencyRates)}
            subtitle={
              nextActionEntries.filter((item) => !item.overdue).length
                ? `${nextActionEntries.filter((item) => !item.overdue).length} due soon`
                : "Nothing urgent"
            }
            tone="coral"
          />
          <StatCard
            label="Owed to you"
            value={moneyLabel(
              totals.owedToMe,
              data.settings,
              data.currencyRates,
            )}
            subtitle={
              activeSharedEvents.length
                ? `${activeSharedEvents.length} active groups`
                : "No active groups"
            }
            tone="teal"
          />
          <StatCard
            label="Net position"
            value={signedMoneyLabel(
              totals.net,
              data.settings,
              data.currencyRates,
            )}
            subtitle={
              netEstimatedInBase > 0
                ? "Your current balance"
                : "No active balance"
            }
            tone="indigo"
          />
        </View>
      </GlassCard>

      <GlassCard
        tone={pendingRequests ? "peach" : "lavender"}
        style={styles.inboxCard}
      >
        <View style={styles.inboxCopy}>
          <Text style={styles.inboxTitle}>Requests and notifications</Text>
          <Text style={styles.inboxBody}>
            {pendingRequests
              ? `${pendingRequests} item${pendingRequests === 1 ? "" : "s"} waiting for your response.`
              : "Nothing needs your answer right now, but your inbox stays one tap away."}
          </Text>
        </View>
        <Button
          title={pendingRequests ? "Open inbox" : "View inbox"}
          variant={pendingRequests ? "primary" : "ghost"}
          onPress={() => router.push("/requests")}
        />
      </GlassCard>

      <SectionTitle
        title="Quick actions"
        subtitle="Common tasks stay visible without taking over the screen."
      />
      <View style={styles.actionGrid}>
        <ActionTile
          icon="receipt-outline"
          title="Add debt"
          subtitle="Track who owes what"
          onPress={() => router.push("/debt/form")}
        />
        <ActionTile
          icon="card-outline"
          title="Record payment"
          subtitle="Log money that moved"
          tone="teal"
          onPress={() => router.push("/payment/form")}
        />
        <ActionTile
          icon="pie-chart-outline"
          title="Split expense"
          subtitle="Create shared shares"
          tone="peach"
          onPress={() => router.push("/expense/form")}
        />
        <ActionTile
          icon="person-add-outline"
          title="Invite member"
          subtitle="Add someone once"
          tone="lavender"
          onPress={() => router.push("/member/form")}
        />
      </View>

      <SectionTitle
        title="Due soon"
        subtitle="What needs attention next, without extra noise."
        action={
          <Button
            title="All debts"
            variant="ghost"
            onPress={() => router.push("/debts")}
          />
        }
      />
      <GlassCard tone="lavender">
        {nextActionEntries.length ? (
          <View style={styles.listColumn}>
            {nextActionEntries.map(({ entry, overdue }) => (
              <ListRow
                key={entry.id}
                title={entry.title}
                subtitle={entryDirectionText(
                  entry,
                  data.members,
                  data.sharedEventMembers,
                )}
                amount={formatMoney(entry.remainingAmount, entry.currency)}
                status={overdue ? "Needs action" : "Due soon"}
                statusTone={overdue ? "coral" : "amber"}
                meta={entry.dueDate ? `Due ${entry.dueDate}` : undefined}
                icon={
                  entry.kind === "expense_obligation"
                    ? "receipt-outline"
                    : "wallet-outline"
                }
                avatars={participantLabels(
                  entry,
                  data.members,
                  data.sharedEventMembers,
                )}
                onPress={() => openEntry(entry)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="Nothing due soon"
            body="You don’t have any upcoming deadlines in this view."
          />
        )}
      </GlassCard>

      <SectionTitle
        title="Recent activity"
        subtitle="The latest changes across your ledger."
      />
      <GlassCard tone="peach">
        {recentActivity.length ? (
          <View style={styles.listColumn}>
            {recentActivity.map((entry) => (
              <ListRow
                key={entry.id}
                title={entry.title}
                subtitle={entryDirectionText(
                  entry,
                  data.members,
                  data.sharedEventMembers,
                )}
                amount={formatMoney(entry.originalAmount, entry.currency)}
                status={activityStatus(entry)}
                statusTone={activityTone(entry)}
                meta={entry.date}
                icon={entry.eventId ? "people-outline" : "wallet-outline"}
                onPress={() => openEntry(entry)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No recent activity"
            body="Your new debts, payments, and shared expenses will show up here."
          />
        )}
      </GlassCard>
    </Screen>
  );
}

function openEntry(
  entry: Pick<LedgerEntry, "kind" | "sourceId" | "expenseId" | "eventId">,
) {
  if (entry.kind === "simple_debt") {
    router.push({ pathname: "/debt/[id]", params: { id: entry.sourceId } });
    return;
  }

  if (entry.kind === "event_direct_debt" && entry.eventId) {
    router.push({ pathname: "/event/[id]", params: { id: entry.eventId } });
    return;
  }

  router.push({
    pathname: "/expense/[id]",
    params: { id: entry.expenseId ?? entry.sourceId },
  });
}

function participantLabels(
  entry: Pick<LedgerEntry, "fromId" | "toId">,
  members: Member[],
  sharedEventMembers: SharedEventMember[],
) {
  return [entry.fromId, entry.toId]
    .filter((participantId) => participantId !== "me")
    .map((participantId) => {
      const sharedMember = sharedEventMembers.find(
        (member) => member.id === participantId,
      );
      if (sharedMember) {
        return sharedMember.alias || sharedMember.displayName;
      }

      return (
        members.find((member) => member.id === participantId)?.displayName ??
        "You"
      );
    });
}

function activityStatus(entry: LedgerEntry) {
  if (entry.paymentStatus === "paid") {
    return "Paid";
  }
  if (entry.paymentStatus === "partially_paid") {
    return "Pending";
  }
  if (
    entry.verificationStatus === "disputed" ||
    entry.verificationStatus === "rejected"
  ) {
    return "Needs review";
  }
  return "Open";
}

function activityTone(entry: LedgerEntry) {
  if (entry.paymentStatus === "paid") {
    return "teal" as const;
  }
  if (entry.paymentStatus === "partially_paid") {
    return "amber" as const;
  }
  if (
    entry.verificationStatus === "disputed" ||
    entry.verificationStatus === "rejected"
  ) {
    return "coral" as const;
  }
  return "indigo" as const;
}

function moneyLabel(
  map: Record<string, number>,
  settings: AppSettings,
  currencyRates: CurrencyRate[],
) {
  return formatMoney(
    estimateMoneyMap(map, settings, currencyRates),
    settings.baseCurrency,
  );
}

function signedMoneyLabel(
  map: Record<string, number>,
  settings: AppSettings,
  currencyRates: CurrencyRate[],
) {
  return formatMoney(
    estimateMoneyMap(map, settings, currencyRates),
    settings.baseCurrency,
    { signed: true },
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  identityCopy: {
    flex: 1,
    gap: 6,
  },
  greeting: {
    color: palette.textPrimary,
    fontSize: 24,
    fontFamily: typefaces.display,
  },
  subGreeting: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    color: palette.primaryDeep,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: typefaces.displayMedium,
  },
  heroSubtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: typefaces.body,
  },
  heroStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  inboxCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  inboxCopy: {
    flex: 1,
    gap: 4,
  },
  inboxTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontFamily: typefaces.bodyStrong,
  },
  inboxBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typefaces.body,
  },
  statsRow: {
    gap: spacing.sm,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  listColumn: {
    gap: spacing.sm,
  },
});
