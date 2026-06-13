import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import {
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
    shadows,
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
    SharedGroupMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Parameters<typeof router.push>[0];
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Add debt", icon: "add-circle", href: "/debt/form" },
  { label: "Record payment", icon: "card", href: "/payment/form" },
  { label: "Split bill", icon: "people", href: "/expense/form" },
  { label: "Add member", icon: "person-add", href: "/member/form" },
];

export function DashboardScreen() {
  const data = useAppData();
  const auth = useAuth();

  const displayName = auth.identity.displayName?.trim() || "there";
  const firstName = displayName.split(" ")[0] || displayName;
  const greetingPeriod = new Date().getHours() < 17 ? "morning" : "evening";
  const today = new Date().toISOString().slice(0, 10);

  const totals = useMemo(
    () => calculatePersonalTotals(data.ledgerEntries),
    [data.ledgerEntries],
  );
  const dueSoonEntries = useMemo(
    () =>
      data.ledgerEntries.filter(
        (entry) =>
          entry.remainingAmount > 0.005 &&
          entry.dueDate &&
          entry.dueDate >= today,
      ),
    [data.ledgerEntries, today],
  );
  const nextActionEntries = useMemo(() => {
    return data.ledgerEntries
      .filter((entry) => entry.remainingAmount > 0.005 && entry.dueDate)
      .sort((first, second) =>
        String(first.dueDate).localeCompare(String(second.dueDate)),
      )
      .slice(0, 4)
      .map((entry) => ({
        entry,
        overdue: entry.dueDate ? entry.dueDate < today : false,
      }));
  }, [data.ledgerEntries, today]);
  const recentActivity = useMemo(
    () => data.ledgerEntries.slice(0, 4),
    [data.ledgerEntries],
  );
  const activeSharedGroups = useMemo(
    () =>
      data.groups
        .filter((group) => !group.archived && group.status !== "settled")
        .slice(0, 3),
    [data.groups],
  );
  const pendingRequests =
    data.linkRequests.filter((item) => item.status === "pending").length +
    data.groupInvites.filter((item) => item.status === "pending").length +
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
  const heroEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(heroEntrance, {
      toValue: 1,
      damping: 18,
      stiffness: 130,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [heroEntrance]);

  const heroAnimatedStyle = {
    opacity: heroEntrance,
    transform: [
      {
        translateY: heroEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: heroEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

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

      <Animated.View style={heroAnimatedStyle}>
        <GlassCard tone="lavender" style={styles.heroCard} allowOverflow>
          <LinearGradient
            pointerEvents="none"
            colors={
              [
                "rgba(221,214,254,0.55)",
                "rgba(253,186,155,0.18)",
                "rgba(255,255,255,0)",
              ] as const
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlow}
          />
          <View pointerEvents="none" style={styles.heroOrbPrimary} />
          <View pointerEvents="none" style={styles.heroOrbPeach} />

          <View style={styles.heroTopRow}>
            <View style={styles.brandPill}>
              <Ionicons name="sparkles" size={13} color={palette.primary} />
              <Text style={styles.brandPillText}>Debtulator</Text>
            </View>
            <View style={[styles.netStatusPill, { borderColor: netStatusTone }]}>
              <Ionicons name={netSummaryIcon} size={13} color={netStatusTone} />
              <Text style={[styles.netStatusText, { color: netStatusTone }]}>
                {netSummaryLabel}
              </Text>
            </View>
          </View>

          <View style={styles.heroMainRow}>
            <View style={styles.netSpotlight}>
              <Text style={styles.netSpotlightLabel}>Net position</Text>
              <Text style={styles.netSpotlightValue} numberOfLines={1}>
                {signedMoneyLabel(totals.net, data.settings, data.currencyRates)}
              </Text>
              <Text style={styles.netSpotlightHint}>
                Clean snapshot across debts, payments, and shared groups.
              </Text>
            </View>

            <View style={styles.heroIconBadge}>
              <Ionicons name="wallet-outline" size={24} color={palette.primary} />
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
              compactDensity="tight"
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
                  : activeSharedGroups.length
                    ? `${activeSharedGroups.length} active groups`
                    : "Nothing pending"
              }
              tone="indigo"
              compact
              compactDensity="tight"
              showCompactSubtitle
            />
          </View>
        </GlassCard>
      </Animated.View>

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
            {nextActionEntries.map(({ entry, overdue }, index) => (
              <ListRow
                key={entry.id}
                title={entry.title}
                subtitle={entryDirectionText(
                  entry,
                  data.members,
                  data.sharedGroupMembers,
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
                  data.sharedGroupMembers,
                )}
                showDivider={index < nextActionEntries.length - 1}
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
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [
              styles.quickActionTile,
              pressed && styles.quickActionTilePressed,
            ]}
          >
            <Ionicons name={action.icon} size={20} color={palette.primary} />
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle
        title="Recent activity"
        subtitle="The latest changes across your ledger."
      />
      <GlassCard tone="peach">
        {recentActivity.length ? (
          <View style={styles.listColumn}>
            {recentActivity.map((entry, index) => (
              <ListRow
                key={entry.id}
                title={entry.title}
                subtitle={entryDirectionText(
                  entry,
                  data.members,
                  data.sharedGroupMembers,
                )}
                amount={formatMoney(entry.originalAmount, entry.currency)}
                status={activityStatus(entry)}
                statusTone={activityTone(entry)}
                meta={entry.date}
                icon={entry.groupId ? "people-outline" : "wallet-outline"}
                showDivider={index < recentActivity.length - 1}
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
  entry: Pick<LedgerEntry, "kind" | "sourceId" | "expenseId" | "groupId">,
) {
  if (entry.kind === "simple_debt") {
    router.push({ pathname: "/debt/[id]", params: { id: entry.sourceId } });
    return;
  }

  if (entry.kind === "group_direct_debt" && entry.groupId) {
    router.push({ pathname: "/group/[id]", params: { id: entry.groupId } });
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
  sharedGroupMembers: SharedGroupMember[],
) {
  return [entry.fromId, entry.toId]
    .filter((participantId) => participantId !== "me")
    .map((participantId) => {
      const sharedMember = sharedGroupMembers.find(
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
    gap: spacing.md,
    paddingTop: 15,
    paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.82)",
    overflow: "hidden",
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  heroOrbPrimary: {
    position: "absolute",
    top: -34,
    right: -28,
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(221,214,254,0.34)",
  },
  heroOrbPeach: {
    position: "absolute",
    bottom: -42,
    left: -30,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(253,186,155,0.18)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandPillText: {
    color: palette.primaryDeep,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  netStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.64)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  netStatusText: {
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
  },
  heroMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  netSpotlight: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
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
    letterSpacing: -0.5,
  },
  netSpotlightHint: {
    maxWidth: 260,
    color: palette.textSecondary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
  },
  heroIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(255,255,255,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  quickActionTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 78,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    backgroundColor: palette.surfaceGlassElevated,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
    ...shadows.card,
  },
  quickActionTilePressed: {
    opacity: 0.75,
  },
  quickActionLabel: {
    color: palette.primary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
    textAlign: "center",
  },
  listColumn: {
    gap: 0,
  },
});
