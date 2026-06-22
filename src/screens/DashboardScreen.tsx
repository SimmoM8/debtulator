import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import { ActivityTimelineRow } from "@/src/components/ActivityTimelineRow";
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
import {
  activityActorLabel,
  activityConfirmationStatus,
  activityDetailRows,
  activitySentence,
  activitySummary,
  buildUserActivity,
} from "@/src/services/activity";
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
  const recentDebts = useMemo(() => {
    const debtUpdatedAt = new Map(
      data.debts.map((debt) => [debt.id, debt.updatedAt]),
    );
    const expenseUpdatedAt = new Map(
      data.sharedExpenses.map((expense) => [expense.id, expense.updatedAt]),
    );
    const groupDebtUpdatedAt = new Map(
      data.groupDebts.map((debt) => [debt.id, debt.updatedAt]),
    );
    const paymentUpdatedAtBySource = new Map<string, string>();

    data.settlementLines.forEach((line) => {
      if (!line.paymentId) return;
      const payment = data.payments.find((item) => item.id === line.paymentId);
      if (!payment) return;
      const key = `${line.sourceRecordType}:${line.sourceRecordId}`;
      const timestamp = payment.updatedAt || payment.createdAt;
      if (timestamp > (paymentUpdatedAtBySource.get(key) ?? "")) {
        paymentUpdatedAtBySource.set(key, timestamp);
      }
    });

    return [...data.ledgerEntries]
      .sort((first, second) =>
        interactionTimestamp(second).localeCompare(interactionTimestamp(first)),
      )
      .slice(0, 4);

    function interactionTimestamp(entry: LedgerEntry) {
      const sourceType =
        entry.kind === "simple_debt"
          ? "simple_debt"
          : entry.kind === "group_direct_debt"
            ? "group_debt"
            : entry.kind === "overpayment_credit"
              ? "overpayment_credit"
              : "shared_expense_obligation";
      const recordTimestamp =
        entry.kind === "simple_debt"
          ? debtUpdatedAt.get(entry.sourceId)
          : entry.kind === "group_direct_debt"
            ? groupDebtUpdatedAt.get(entry.sourceId)
            : entry.kind === "expense_obligation"
              ? expenseUpdatedAt.get(entry.expenseId ?? entry.sourceId)
              : undefined;
      return (
        [
          recordTimestamp,
          paymentUpdatedAtBySource.get(`${sourceType}:${entry.sourceId}`),
        ]
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? entry.date
      );
    }
  }, [
    data.debts,
    data.groupDebts,
    data.ledgerEntries,
    data.payments,
    data.settlementLines,
    data.sharedExpenses,
  ]);
  const recentActivity = useMemo(
    () =>
      buildUserActivity({
        activityLogs: data.activityLogs,
        auditLogs: data.auditLogs,
        groupActivityLogs: data.groupActivityLogs,
        linkRequests: data.linkRequests,
        debts: data.debts,
        debtVerifications: data.debtVerifications,
        groupDebts: data.groupDebts,
        payments: data.payments,
        sharedExpenses: data.sharedExpenses,
        currentUserId: auth.identity.authenticatedUserId,
      })
        .sort((first, second) =>
          second.createdAt.localeCompare(first.createdAt),
        )
        .slice(0, 5),
    [
      data.activityLogs,
      data.auditLogs,
      data.debts,
      data.debtVerifications,
      data.groupActivityLogs,
      data.linkRequests,
      data.groupDebts,
      data.payments,
      data.sharedExpenses,
      auth.identity.authenticatedUserId,
    ],
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
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroMainRow}>
            <View style={styles.netSpotlight}>
              <Text style={styles.netSpotlightLabel}>Net position</Text>
              <Text style={styles.netSpotlightValue} numberOfLines={1}>
                {signedMoneyLabel(
                  totals.net,
                  data.settings,
                  data.currencyRates,
                )}
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
            <View
              style={[
                styles.summaryMetrics,
                compactSummary && styles.summaryMetricsCompact,
              ]}
            >
              {summaryMetrics.map((metric) => (
                <SummaryMetric key={metric.label} {...metric} />
              ))}
            </View>
          </Animated.View>
        </GlassCard>
      </Animated.View>

      <SectionTitle title="Quick actions" />
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

      {nextActionEntries.length ? (
        <>
          <SectionTitle
            title="Due soon"
            action={
              <SectionActionLink
                label="View all"
                onPress={() => router.push("/debts")}
              />
            }
          />
          <GlassCard tone="lavender">
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
          </GlassCard>
        </>
      ) : (
        <>
          <SectionTitle title="Recent debts" />
          <GlassCard tone="peach">
            {recentDebts.length ? (
              <View style={styles.listColumn}>
                {recentDebts.map((entry, index) => (
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
                    showDivider={index < recentDebts.length - 1}
                    onPress={() => openEntry(entry)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="No recent debts"
                body="Debts you create, edit, or pay will show up here."
              />
            )}
          </GlassCard>
        </>
      )}

      <SectionTitle
        title="Recent activity"
        action={
          <SectionActionLink
            label="View all"
            onPress={() => router.push("/activity")}
          />
        }
      />
      <GlassCard tone="lavender">
        {recentActivity.length ? (
          <View style={styles.listColumn}>
            {recentActivity.map((activity, index) => (
              <ActivityTimelineRow
                key={activity.id}
                title={activitySentence(
                  activityActorLabel(
                    activity.actorUserId,
                    auth.identity.authenticatedUserId,
                    data.profiles,
                    data.sharedGroupMembers,
                    data.members,
                  ),
                  activity.action,
                )}
                createdAt={activity.createdAt}
                detail={activitySummary(activity, data)}
                confirmationStatus={activityConfirmationStatus(activity)}
                details={activityDetailRows(activity)}
                isLast={index === recentActivity.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No recent activity"
            body="Relevant actions from you and other participants will show up here."
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
}: {
  label: string;
  value: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  softTone: string;
}) {
  return (
    <View style={styles.summaryMetric}>
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
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anchorRef = React.useRef<View>(null);
  const window = useWindowDimensions();
  const dropdownPosition = {
    left: spacing.md,
    width: window.width - spacing.md * 2,
    maxHeight: 320,
    ...(window.height - anchor.y - anchor.height >= 220
      ? { top: anchor.y + anchor.height + spacing.xs }
      : { bottom: window.height - anchor.y + spacing.xs }),
  };

  function openSelector() {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }

  return (
    <>
      <Pressable
        ref={anchorRef}
        accessibilityRole="button"
        accessibilityLabel={`Summary currency, ${value}`}
        accessibilityHint="Opens currency selector for estimated summary values"
        onPress={openSelector}
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
        <Pressable
          accessible={false}
          style={styles.currencyDropdownOverlay}
          onPress={() => setOpen(false)}
        >
          <Pressable
            accessible={false}
            style={[styles.currencyDropdownPosition, dropdownPosition]}
            onPress={(event) => event.stopPropagation()}
          >
            <GlassCard style={styles.currencyDropdownMenu}>
              {CURRENCIES.map((currency) => {
                const active = currency === value;
                return (
                  <Pressable
                    key={currency}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(currency);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.currencyDropdownOption,
                      active && styles.currencyDropdownOptionActive,
                      pressed && styles.quickActionTilePressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyDropdownOptionText,
                        active && styles.currencyDropdownOptionTextActive,
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
            </GlassCard>
          </Pressable>
        </Pressable>
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
    backgroundColor: palette.surfaceGlassElevated,
  },
  currencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "center",
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
  currencyDropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
  },
  currencyDropdownPosition: { position: "absolute" },
  currencyDropdownMenu: { padding: spacing.sm, gap: 2 },
  currencyDropdownOption: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyDropdownOptionActive: { backgroundColor: palette.lavenderMist },
  currencyDropdownOptionText: {
    color: palette.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  currencyDropdownOptionTextActive: { color: palette.primary },
  heroMainRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: spacing.md,
  },
  netSpotlight: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  netSpotlightLabel: {
    color: palette.textSecondary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.sm,
    fontFamily: typefaces.body,
    textAlign: "center",
  },
  netSpotlightValue: {
    color: palette.primaryDeep,
    fontSize: typography.size.displayXl,
    lineHeight: typography.line.displayXl,
    fontFamily: typefaces.display,
    textAlign: "center",
    letterSpacing: 0,
  },
  summaryPanel: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
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
