import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import { GlassCard, ListRow } from "@/src/components/ui/Finance";
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
import { CURRENCIES } from "@/src/constants/currencies";
import { estimateMoneyMap } from "@/src/services/currency";
import {
    calculatePersonalTotals,
    entryDirectionText,
} from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    AppSettings,
    CurrencyCode,
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
  const { width } = useWindowDimensions();

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
  const iOweEstimated = estimateMoneyMap(
    totals.iOwe,
    data.settings,
    data.currencyRates,
  );
  const owedToMeEstimated = estimateMoneyMap(
    totals.owedToMe,
    data.settings,
    data.currencyRates,
  );
  const exposureTotal = iOweEstimated + owedToMeEstimated;
  const owedToMeRatio =
    exposureTotal > 0 ? owedToMeEstimated / exposureTotal : 0.5;
  const summaryMetrics = [
    {
      label: "You owe",
      value: formatMoney(iOweEstimated, data.settings.baseCurrency),
      caption:
        dueSoonIOwe > 0
          ? `Due soon ${formatMoney(dueSoonIOwe, data.settings.baseCurrency)}`
          : "Nothing urgent",
      icon: "arrow-up-outline" as const,
      tone: palette.danger,
      softTone: palette.dangerSoft,
    },
    {
      label: "Owed to you",
      value: formatMoney(owedToMeEstimated, data.settings.baseCurrency),
      caption:
        dueSoonOwedToMe > 0
          ? `Due soon ${formatMoney(dueSoonOwedToMe, data.settings.baseCurrency)}`
          : activeSharedGroups.length
            ? `${activeSharedGroups.length} active groups`
            : "Nothing pending",
      icon: "arrow-down-outline" as const,
      tone: palette.primary,
      softTone: "rgba(55,48,163,0.1)",
    },
  ];
  const compactSummary = width < 390;
  const [heroEntrance] = useState(() => new Animated.Value(0));
  const [heroDetailsEntrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroEntrance, {
        toValue: 1,
        damping: 18,
        stiffness: 130,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(heroDetailsEntrance, {
        toValue: 1,
        duration: 520,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroDetailsEntrance, heroEntrance]);

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
  const summaryDetailsAnimatedStyle = {
    opacity: heroDetailsEntrance,
    transform: [
      {
        translateY: heroDetailsEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
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
                "rgba(255,255,255,0.96)",
                "rgba(246,243,255,0.9)",
                "rgba(253,186,155,0.16)",
              ] as const
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlow}
          />
          <LinearGradient
            pointerEvents="none"
            colors={
              [
                "rgba(55,48,163,0.16)",
                "rgba(253,186,155,0.18)",
                "rgba(47,191,143,0.1)",
              ] as const
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroAccent}
          />

          <View
            style={[
              styles.heroMainRow,
              compactSummary && styles.heroMainRowCompact,
            ]}
          >
            <View style={styles.netSpotlight}>
              <View style={styles.netLabelRow}>
                <Text style={styles.netSpotlightLabel}>Net position</Text>
                <View
                  style={[styles.netStatusPill, { borderColor: netStatusTone }]}
                >
                  <Ionicons
                    name={netSummaryIcon}
                    size={13}
                    color={netStatusTone}
                  />
                  <Text style={[styles.netStatusText, { color: netStatusTone }]}>
                    {netSummaryLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.netSpotlightValue} numberOfLines={1}>
                {signedMoneyLabel(totals.net, data.settings, data.currencyRates)}
              </Text>
            </View>
            <CompactCurrencySelector
              value={data.settings.baseCurrency}
              onChange={(baseCurrency) => {
                void data.updateSettings({ baseCurrency });
              }}
            />
          </View>

          <Animated.View
            style={[styles.summaryPanel, summaryDetailsAnimatedStyle]}
          >
            <View style={styles.balanceTrack}>
              <View style={styles.balanceTrackBase}>
                <View
                  style={[
                    styles.balanceTrackFill,
                    { width: `${Math.round(owedToMeRatio * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.balanceTrackLabels}>
                <Text style={styles.balanceTrackLabel}>Out</Text>
                <Text style={styles.balanceTrackLabel}>In</Text>
              </View>
            </View>

            <View
              style={[
                styles.summaryMetrics,
                compactSummary && styles.summaryMetricsCompact,
              ]}
            >
              {summaryMetrics.map((metric, index) => (
                <SummaryMetric
                  key={metric.label}
                  {...metric}
                  emphasized={index === 1}
                />
              ))}
            </View>
          </Animated.View>
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

function SummaryMetric({
  label,
  value,
  caption,
  icon,
  tone,
  softTone,
  emphasized = false,
}: {
  label: string;
  value: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  softTone: string;
  emphasized?: boolean;
}) {
  return (
    <View
      style={[styles.summaryMetric, emphasized && styles.summaryMetricEmphasis]}
    >
      <View style={[styles.summaryMetricIcon, { backgroundColor: softTone }]}>
        <Ionicons name={icon} size={15} color={tone} />
      </View>
      <View style={styles.summaryMetricCopy}>
        <Text style={styles.summaryMetricLabel}>{label}</Text>
        <Text
          style={[styles.summaryMetricValue, { color: tone }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text style={styles.summaryMetricCaption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

function CompactCurrencySelector({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Summary currency, ${value}`}
        accessibilityHint="Opens currency selector for estimated summary values"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.currencyPill,
          pressed && styles.quickActionTilePressed,
        ]}
      >
        <Ionicons name="cash-outline" size={15} color={palette.primary} />
        <Text style={styles.currencyPillText}>{value}</Text>
        <Ionicons name="chevron-down" size={14} color={palette.primary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.currencyOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close currency selector"
            style={styles.currencyBackdrop}
            onPress={() => setOpen(false)}
          />
          <GlassCard tone="lavender" style={styles.currencyMenu}>
            <Text style={styles.currencyMenuTitle}>Summary currency</Text>
            <Text style={styles.currencyMenuBody}>
              Estimated totals use the local exchange-rate table.
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.currencyOptionList}
            >
              {CURRENCIES.map((currency) => {
                const active = currency === value;

                return (
                  <Pressable
                    key={currency}
                    accessibilityRole="button"
                    accessibilityLabel={currency}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(currency);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.currencyOption,
                      active && styles.currencyOptionActive,
                      pressed && styles.quickActionTilePressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyOptionText,
                        active && styles.currencyOptionTextActive,
                      ]}
                    >
                      {currency}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={palette.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </>
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
    gap: spacing.xl,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    overflow: "hidden",
  },
  heroGlow: {
    ...StyleSheet.absoluteFill,
    opacity: 1,
  },
  heroAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 4,
  },
  netStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  netStatusText: {
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
  },
  currencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(255,255,255,0.86)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    ...shadows.soft,
  },
  currencyPillText: {
    color: palette.primaryDeep,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyHeavy,
  },
  heroMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xl,
  },
  heroMainRowCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: spacing.md,
  },
  netSpotlight: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 5,
  },
  netLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
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
    letterSpacing: 0,
  },
  summaryPanel: {
    gap: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.borderIndigoSoft,
    paddingTop: spacing.lg,
  },
  balanceTrack: {
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.48)",
    padding: spacing.sm,
  },
  balanceTrackBase: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,107,107,0.14)",
    overflow: "hidden",
  },
  balanceTrackFill: {
    alignSelf: "flex-end",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(55,48,163,0.72)",
  },
  balanceTrackLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceTrackLabel: {
    color: palette.textTertiary,
    fontSize: typography.size.xxs,
    lineHeight: typography.line.xxs,
    fontFamily: typefaces.bodyStrong,
  },
  summaryMetrics: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  summaryMetricsCompact: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    backgroundColor: "rgba(255,255,255,0.62)",
    padding: spacing.md,
  },
  summaryMetricEmphasis: {
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(246,243,255,0.72)",
  },
  summaryMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryMetricCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  summaryMetricLabel: {
    color: palette.textSecondary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
  },
  summaryMetricValue: {
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.numeric,
  },
  summaryMetricCaption: {
    color: palette.textTertiary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.body,
  },
  currencyOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screen,
  },
  currencyBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17,24,39,0.18)",
  },
  currencyMenu: {
    width: "100%",
    maxWidth: 320,
    gap: spacing.sm,
  },
  currencyMenuTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.displayMedium,
  },
  currencyMenuBody: {
    color: palette.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: typography.line.base,
    fontFamily: typefaces.body,
  },
  currencyOptionList: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  currencyOption: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    backgroundColor: "rgba(255,255,255,0.64)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  currencyOptionActive: {
    borderColor: palette.borderIndigo,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  currencyOptionText: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    lineHeight: typography.line.basePlus,
    fontFamily: typefaces.bodyStrong,
  },
  currencyOptionTextActive: {
    color: palette.primary,
    fontFamily: typefaces.bodyHeavy,
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
