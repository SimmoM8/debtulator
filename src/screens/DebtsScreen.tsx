import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import {
  GlassCard,
  ListRow,
  SearchFilterBar,
  SingleSelectFilterList,
  StatCard,
} from "@/src/components/ui/Finance";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import {
  Button,
  EmptyState,
  FilterSheet,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
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
import { entryDirectionText } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import type {
  AppSettings,
  CurrencyCode,
  CurrencyRate,
  LedgerEntry,
  Member,
  SharedGroupMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type DebtFilter = "all" | "you-owe" | "owed-to-you" | "due-soon";

export function DebtsScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DebtFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [statsWidth, setStatsWidth] = useState(0);
  const quickFilterTranslate = useRef(new Animated.Value(0)).current;
  const quickFilterOpacity = useRef(new Animated.Value(0)).current;
  const quickFilterIndex =
    filter === "you-owe" ? 0 : filter === "owed-to-you" ? 1 : null;
  const quickFilterGlassTone =
    filter === "you-owe"
      ? {
          borderColor: "rgba(255,107,107,0.52)",
        }
      : {
          borderColor: "rgba(55,48,163,0.34)",
        };

  useEffect(() => {
    const segmentWidth = statsWidth / 2;
    Animated.parallel([
      Animated.timing(quickFilterTranslate, {
        toValue: quickFilterIndex === null ? 0 : quickFilterIndex * segmentWidth,
        duration: 210,
        useNativeDriver: true,
      }),
      Animated.timing(quickFilterOpacity, {
        toValue: quickFilterIndex === null || !statsWidth ? 0 : 1,
        duration: quickFilterIndex === null ? 130 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [quickFilterIndex, quickFilterOpacity, quickFilterTranslate, statsWidth]);

  const activeMatchedEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.ledgerEntries.filter((entry) => {
      if (entry.status === "archived") {
        return false;
      }

      const direction = entryDirectionText(
        entry,
        data.members,
        data.sharedGroupMembers,
      ).toLowerCase();
      const groupName = entry.groupId
        ? (data.groups
            .find((group) => group.id === entry.groupId)
            ?.name.toLowerCase() ?? "")
        : "";
      const matchesQuery =
        !normalized ||
        entry.title.toLowerCase().includes(normalized) ||
        (entry.notes ?? "").toLowerCase().includes(normalized) ||
        direction.includes(normalized) ||
        groupName.includes(normalized);

      if (!matchesQuery) {
        return false;
      }

      const isSettled =
        entry.remainingAmount <= 0.005 ||
        entry.status === "settled" ||
        entry.paymentStatus === "paid";
      if (isSettled) {
        return false;
      }

      return true;
    });
  }, [
    data.groups,
    data.ledgerEntries,
    data.members,
    data.sharedGroupMembers,
    query,
  ]);

  const filteredEntries = useMemo(() => {
    return activeMatchedEntries.filter((entry) => {
      const isDueSoon = Boolean(entry.dueDate && entry.remainingAmount > 0.005);
      const isYouOwe = entry.fromId === "me";
      const isOwedToYou = entry.toId === "me";

      switch (filter) {
        case "you-owe":
          return isYouOwe;
        case "owed-to-you":
          return isOwedToYou;
        case "due-soon":
          return isDueSoon;
        default:
          return true;
      }
    });
  }, [activeMatchedEntries, filter]);

  const youOwe = filteredEntries.filter(
    (entry) => entry.fromId === "me" && entry.remainingAmount > 0.005,
  );
  const owedToYou = filteredEntries.filter(
    (entry) => entry.toId === "me" && entry.remainingAmount > 0.005,
  );
  const owingCount = activeMatchedEntries.filter(
    (entry) => entry.fromId === "me" && entry.remainingAmount > 0.005,
  ).length;
  const owedCount = activeMatchedEntries.filter(
    (entry) => entry.toId === "me" && entry.remainingAmount > 0.005,
  ).length;

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Debts"
        showBackButton={false}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Debt options"
            onPress={() => setOptionsOpen(true)}
          />
        }
      />

      <Button title="Add debt" icon="add" onPress={() => router.push("/debt/form")} />

      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search debts"
        onPressFilter={() => setFilterOpen(true)}
        filterActive={filter !== "all"}
        filterLabel="Open debt filters"
      />

      <GlassCard tone="lavender" allowOverflow>
        <View
          style={styles.statsRow}
          onLayout={(event) => setStatsWidth(event.nativeEvent.layout.width)}
        >
          {statsWidth ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.quickFilterGlass,
                quickFilterGlassTone,
                {
                  width: statsWidth / 2 - 8,
                  opacity: quickFilterOpacity,
                  transform: [{ translateX: quickFilterTranslate }],
                },
              ]}
            />
          ) : null}
          <StatCard
            label="Owing"
            value={String(owingCount)}
            subtitle="Debts you still need to pay"
            tone="coral"
            compact
            compactDensity="tight"
            withDivider
            selected={filter === "you-owe"}
            onPress={() =>
              setFilter((current) => (current === "you-owe" ? "all" : "you-owe"))
            }
            accessibilityHint="Shows debts you still owe"
          />
          <StatCard
            label="Owed"
            value={String(owedCount)}
            subtitle="Debts other people owe you"
            tone="indigo"
            compact
            compactDensity="tight"
            selected={filter === "owed-to-you"}
            onPress={() =>
              setFilter((current) =>
                current === "owed-to-you" ? "all" : "owed-to-you",
              )
            }
            accessibilityHint="Shows debts owed to you"
          />
        </View>
      </GlassCard>

      <FilterSheet
        visible={filterOpen}
        title="Debt filters"
        subtitle="Choose which balances show up in your list."
        onClose={() => setFilterOpen(false)}
      >
        <SingleSelectFilterList
          value={filter}
          options={FILTERS}
          onChange={(value) => {
            setFilter(value as DebtFilter);
            setFilterOpen(false);
          }}
        />
      </FilterSheet>

      <MobileMenuModal
        visible={optionsOpen}
        title="Debt options"
        onClose={() => setOptionsOpen(false)}
        sections={[
          {
            items: [
              {
                label: "History",
                subtitle: "View settled debts and how they were closed",
                icon: "time-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  router.push("/debt/history");
                },
              },
              {
                label: "Open filters",
                subtitle: "Change which active debts are shown",
                icon: "options-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  setFilterOpen(true);
                },
              },
            ],
          },
        ]}
      />

      <LedgerSection
        title="You owe"
        subtitle="Things you still need to pay."
        entries={youOwe}
        summaryAmount={sectionTotalLabel(
          youOwe,
          data.settings,
          data.currencyRates,
        )}
        summaryTone="negative"
        members={data.members}
        sharedGroupMembers={data.sharedGroupMembers}
      />
      <LedgerSection
        title="Owed to you"
        subtitle="Things other people still owe you."
        entries={owedToYou}
        summaryAmount={sectionTotalLabel(
          owedToYou,
          data.settings,
          data.currencyRates,
        )}
        summaryTone="positive"
        members={data.members}
        sharedGroupMembers={data.sharedGroupMembers}
      />
      {!filteredEntries.length ? (
        <GlassCard tone="lavender">
          <EmptyState
            title="No debts found"
            body="Try a different filter or add a new debt from the center add button."
          />
        </GlassCard>
      ) : null}
    </Screen>
  );
}

function LedgerSection({
  title,
  subtitle,
  entries,
  summaryAmount,
  summaryTone,
  members,
  sharedGroupMembers,
}: {
  title: string;
  subtitle: string;
  entries: LedgerEntry[];
  summaryAmount: string;
  summaryTone: "positive" | "negative" | "neutral";
  members: Member[];
  sharedGroupMembers: SharedGroupMember[];
}) {
  if (!entries.length) {
    return null;
  }

  return (
    <>
      <SectionTitle
        title={title}
        subtitle={subtitle}
        action={
          <Text
            style={[
              styles.sectionAmount,
              summaryTone === "positive"
                ? styles.sectionAmountPositive
                : summaryTone === "negative"
                  ? styles.sectionAmountNegative
                  : styles.sectionAmountNeutral,
            ]}
          >
            {summaryAmount}
          </Text>
        }
      />
      <GlassCard tone={title === "You owe" ? "coral" : "lavender"}>
        <View style={styles.listColumn}>
          {entries.map((entry, index) => (
            <ListRow
              key={entry.id}
              title={entry.title}
              subtitle={
                entry.groupId
                  ? "Shared"
                  : entry.kind === "expense_obligation"
                    ? "Bills"
                    : entryDirectionText(entry, members, sharedGroupMembers)
              }
              amount={formatMoney(
                entry.remainingAmount <= 0.005
                  ? entry.originalAmount
                  : entry.remainingAmount,
                entry.currency as CurrencyCode,
              )}
              trailingLabel={debtDueLabel(entry)}
              trailingTone={debtDueTone(entry)}
              icon={entry.groupId ? "people-outline" : "wallet-outline"}
              iconTone={entry.groupId ? "teal" : "indigo"}
              showDivider={index < entries.length - 1}
              onPress={() => openEntry(entry)}
            />
          ))}
        </View>
      </GlassCard>
    </>
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

function debtDueLabel(entry: LedgerEntry) {
  if (entry.remainingAmount <= 0.005 || entry.status === "settled") {
    return "Settled";
  }

  if (!entry.dueDate) {
    return entry.toId === "me" ? "Waiting on them" : "No due date";
  }

  const today = new Date().toISOString().slice(0, 10);
  if (entry.dueDate < today) {
    return "Overdue";
  }

  const todayTime = new Date(`${today}T00:00:00Z`).getTime();
  const dueTime = new Date(`${entry.dueDate}T00:00:00Z`).getTime();
  const days = Math.max(0, Math.round((dueTime - todayTime) / 86400000));

  if (days === 0) {
    return "Due today";
  }
  if (days === 1) {
    return "Due tomorrow";
  }
  return `Due in ${days} days`;
}

function debtDueTone(
  entry: LedgerEntry,
): "teal" | "amber" | "coral" | "muted" | "indigo" {
  if (entry.remainingAmount <= 0.005 || entry.status === "settled") {
    return "teal";
  }
  if (!entry.dueDate) {
    return "muted";
  }
  const today = new Date().toISOString().slice(0, 10);
  if (entry.dueDate < today) {
    return "coral";
  }
  const todayTime = new Date(`${today}T00:00:00Z`).getTime();
  const dueTime = new Date(`${entry.dueDate}T00:00:00Z`).getTime();
  const days = Math.max(0, Math.round((dueTime - todayTime) / 86400000));
  return days <= 2 ? "coral" : "indigo";
}

function sectionTotalLabel(
  entries: LedgerEntry[],
  settings: AppSettings,
  currencyRates: CurrencyRate[],
) {
  const totalsByCurrency = entries.reduce<Record<string, number>>(
    (acc, entry) => {
      const amount =
        entry.remainingAmount <= 0.005
          ? entry.originalAmount
          : entry.remainingAmount;

      acc[entry.currency] = (acc[entry.currency] ?? 0) + amount;
      return acc;
    },
    {},
  );

  return formatMoney(
    estimateMoneyMap(totalsByCurrency, settings, currencyRates),
    settings.baseCurrency,
  );
}

const FILTERS: { label: string; value: DebtFilter; description: string }[] = [
  {
    label: "All",
    value: "all",
    description: "Everything still visible, regardless of direction or status.",
  },
  {
    label: "You owe",
    value: "you-owe",
    description: "Only balances you still need to pay.",
  },
  {
    label: "Owed to you",
    value: "owed-to-you",
    description: "Only balances other people still owe you.",
  },
  {
    label: "Due soon",
    value: "due-soon",
    description: "Open balances that already have a due date.",
  },
];

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    position: "relative",
  },
  quickFilterGlass: {
    position: "absolute",
    top: -5,
    bottom: -5,
    left: 4,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    ...shadows.soft,
  },
  listColumn: {
    gap: spacing.sm,
  },
  sectionAmount: {
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.displayMedium,
  },
  sectionAmountPositive: {
    color: palette.success,
  },
  sectionAmountNegative: {
    color: palette.danger,
  },
  sectionAmountNeutral: {
    color: palette.textSecondary,
  },
});
