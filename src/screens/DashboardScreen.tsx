import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import {
  ActionTile,
  GlassCard,
  ListRow,
  StatCard,
} from "@/src/components/ui/Finance";
import {
  EmptyState,
  IconButton,
  LoadingState,
  Screen,
  SectionActionLink,
  SectionTitle,
} from "@/src/components/ui/Primitives";
import {
  palette,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";
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
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const displayName = auth.identity.displayName?.trim() || "there";
  const firstName = displayName.split(" ")[0] || displayName;
  const greetingPeriod = new Date().getHours() < 17 ? "morning" : "evening";
  const today = new Date().toISOString().slice(0, 10);

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
  const dueSoonEntries = useMemo(
    () =>
      scopedEntries.filter(
        (entry) =>
          entry.remainingAmount > 0.005 &&
          entry.dueDate &&
          entry.dueDate >= today,
      ),
    [scopedEntries, today],
  );
  const nextActionEntries = useMemo(() => {
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
  }, [scopedEntries, today]);
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
  const dueSoonIOwe = useMemo(
    () =>
      dueSoonEntries
        .filter((entry) => entry.fromId === "me")
        .reduce(
          (sum, entry) =>
            sum +
            estimateMoneyMap(
              { [entry.currency]: entry.remainingAmount },
              data.settings,
              data.currencyRates,
            ),
          0,
        ),
    [data.currencyRates, data.settings, dueSoonEntries],
  );
  const dueSoonOwedToMe = useMemo(
    () =>
      dueSoonEntries
        .filter((entry) => entry.toId === "me")
        .reduce(
          (sum, entry) =>
            sum +
            estimateMoneyMap(
              { [entry.currency]: entry.remainingAmount },
              data.settings,
              data.currencyRates,
            ),
          0,
        ),
    [data.currencyRates, data.settings, dueSoonEntries],
  );
  const modeLabel = MODE_LABELS[mode];
  const netSummaryLabel =
    netEstimatedInBase > 0
      ? "You're ahead"
      : netEstimatedInBase < 0
        ? "You're behind"
        : "All square";
  const netSummaryIcon =
    netEstimatedInBase > 0
      ? "arrow-up-circle"
      : netEstimatedInBase < 0
        ? "arrow-down-circle"
        : "remove-circle";
  const netStatusTone =
    netEstimatedInBase > 0
      ? palette.success
      : netEstimatedInBase < 0
        ? palette.danger
        : palette.textSecondary;

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton
          icon="notifications-outline"
          label={pendingRequests ? "Open notifications" : "View notifications"}
          onPress={() => router.push("/requests")}
        />
        <View style={styles.identityCopy}>
          <Text style={styles.greeting}>
            Good {greetingPeriod}, {firstName}
          </Text>
          <Text
            style={styles.subGreeting}
          >{`Here's your ${greetingPeriod} snapshot`}</Text>
        </View>
        <AppMenuButton />
      </View>

      <GlassCard tone="lavender" style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.brandRow}>
            <Text style={styles.heroTitle}>Debtulator</Text>
            <Ionicons
              name="sparkles"
              size={14}
              color={palette.primary}
              style={styles.brandSparkle}
            />
          </View>
          <Pressable
            onPress={() => setModeMenuOpen(true)}
            style={({ pressed }) => [
              styles.heroControl,
              pressed && styles.heroControlPressed,
            ]}
          >
            <Text style={styles.heroControlText}>{modeLabel}</Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={palette.primaryDeep}
            />
          </Pressable>
        </View>

        <View style={styles.netSpotlight}>
          <Text style={styles.netSpotlightLabel}>Net position</Text>
          <Text style={styles.netSpotlightValue}>
            {signedMoneyLabel(totals.net, data.settings, data.currencyRates)}
          </Text>
          <View style={styles.netSpotlightMetaRow}>
            <Ionicons
              name={netSummaryIcon}
              size={13}
              color={netStatusTone}
              style={styles.netSpotlightMetaIcon}
            />
            <Text style={[styles.netSpotlightMeta, { color: netStatusTone }]}>
              {netSummaryLabel}
            </Text>
          </View>
        </View>

        <View style={styles.snapshotRow}>
          <StatCard
            label="You owe"
            value={moneyLabel(totals.iOwe, data.settings, data.currencyRates)}
            subtitle={
              dueSoonIOwe > 0
                ? `Due soon ${formatMoney(dueSoonIOwe, data.settings.baseCurrency)}`
                : "Nothing urgent"
            }
            tone="coral"
            compact
            showCompactSubtitle
            withDivider
          />
          <StatCard
            label="Owed to you"
            value={moneyLabel(
              totals.owedToMe,
              data.settings,
              data.currencyRates,
            )}
            subtitle={
              dueSoonOwedToMe > 0
                ? `Due soon ${formatMoney(dueSoonOwedToMe, data.settings.baseCurrency)}`
                : activeSharedEvents.length
                  ? `${activeSharedEvents.length} active groups`
                  : "Nothing pending"
            }
            tone="indigo"
            compact
            showCompactSubtitle
          />
        </View>
      </GlassCard>

      <Modal
        visible={modeMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModeMenuOpen(false)}
      >
        <View style={styles.modeMenuOverlay}>
          <Pressable
            style={styles.modeMenuBackdrop}
            onPress={() => setModeMenuOpen(false)}
          />
          <View style={styles.modeMenuCard}>
            {MODE_OPTIONS.map((option, index) => {
              const active = option.value === mode;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setMode(option.value);
                    setModeMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modeMenuItem,
                    index > 0 && styles.modeMenuItemDivider,
                    active && styles.modeMenuItemActive,
                    pressed && styles.heroControlPressed,
                  ]}
                >
                  <View style={styles.modeMenuItemCopy}>
                    <Text
                      style={[
                        styles.modeMenuItemLabel,
                        active && styles.modeMenuItemLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.modeMenuItemHint}>{option.hint}</Text>
                  </View>
                  {active ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={palette.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <SectionTitle
        title="Due soon"
        subtitle="What needs attention next, without extra noise."
        action={
          <SectionActionLink
            label="View all"
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

const MODE_LABELS: Record<LedgerMode, string> = {
  personal: "Personal",
  shared: "Shared",
  all: "All entries",
};

const MODE_OPTIONS: { value: LedgerMode; label: string; hint: string }[] = [
  {
    value: "personal",
    label: "Personal",
    hint: "Only your direct balances",
  },
  {
    value: "shared",
    label: "Shared",
    hint: "Only group and shared items",
  },
  {
    value: "all",
    label: "All entries",
    hint: "Everything in one summary",
  },
];

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
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.displayMedium,
  },
  subGreeting: {
    color: palette.muted,
    fontSize: typography.size.sm,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
  },
  heroCard: {
    gap: 10,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  heroTitle: {
    color: palette.primaryDeep,
    fontSize: typography.size.displaySm,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.display,
  },
  brandSparkle: {
    marginTop: 2,
  },
  heroControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  heroControlPressed: {
    opacity: 0.82,
  },
  heroControlText: {
    color: palette.primaryDeep,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    backgroundColor: "transparent",
  },
  netSpotlight: {
    alignSelf: "stretch",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 3,
  },
  netSpotlightLabel: {
    color: palette.textSecondary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
    textAlign: "left",
  },
  netSpotlightValue: {
    color: palette.primaryDeep,
    fontSize: typography.size.displayXl,
    lineHeight: typography.line.displayXl,
    fontFamily: typefaces.display,
    textAlign: "left",
  },
  netSpotlightMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  netSpotlightMetaIcon: {
    marginTop: 0.5,
  },
  netSpotlightMeta: {
    fontSize: typography.size.sm,
    lineHeight: typography.line.md,
    fontFamily: typefaces.bodyStrong,
    textAlign: "left",
  },
  modeMenuOverlay: {
    flex: 1,
    paddingTop: 140,
    paddingRight: spacing.screen,
    alignItems: "flex-end",
  },
  modeMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.08)",
  },
  modeMenuCard: {
    width: 198,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    backgroundColor: "rgba(255,255,255,0.98)",
    overflow: "hidden",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  modeMenuItem: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  modeMenuItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  modeMenuItemActive: {
    backgroundColor: "rgba(246,243,255,0.95)",
  },
  modeMenuItemCopy: {
    flex: 1,
    gap: 2,
  },
  modeMenuItemLabel: {
    color: palette.textPrimary,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  modeMenuItemLabelActive: {
    color: palette.primaryDeep,
  },
  modeMenuItemHint: {
    color: palette.textTertiary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.md,
    fontFamily: typefaces.body,
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
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyStrong,
  },
  inboxBody: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
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
