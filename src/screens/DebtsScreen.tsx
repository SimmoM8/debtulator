import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  GlassCard,
  ListRow,
  SearchFilterBar,
  SingleSelectFilterList,
  StatCard,
} from "@/src/components/ui/Finance";
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
  SharedEventMember,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type DebtFilter = "all" | "you-owe" | "owed-to-you" | "due-soon" | "settled";

export function DebtsScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DebtFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  function openOptions() {
    Alert.alert("Debt options", "Choose an action", [
      {
        text: "Open filters",
        onPress: () => setFilterOpen(true),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.ledgerEntries.filter((entry) => {
      if (entry.status === "archived") {
        return false;
      }

      const direction = entryDirectionText(
        entry,
        data.members,
        data.sharedEventMembers,
      ).toLowerCase();
      const eventName = entry.eventId
        ? (data.events
            .find((event) => event.id === entry.eventId)
            ?.name.toLowerCase() ?? "")
        : "";
      const matchesQuery =
        !normalized ||
        entry.title.toLowerCase().includes(normalized) ||
        (entry.notes ?? "").toLowerCase().includes(normalized) ||
        direction.includes(normalized) ||
        eventName.includes(normalized);

      if (!matchesQuery) {
        return false;
      }

      const isSettled =
        entry.remainingAmount <= 0.005 ||
        entry.status === "settled" ||
        entry.paymentStatus === "paid";
      const isDueSoon = Boolean(entry.dueDate && entry.remainingAmount > 0.005);
      const isYouOwe = entry.fromId === "me";
      const isOwedToYou = entry.toId === "me";

      switch (filter) {
        case "you-owe":
          return isYouOwe && !isSettled;
        case "owed-to-you":
          return isOwedToYou && !isSettled;
        case "due-soon":
          return isDueSoon && !isSettled;
        case "settled":
          return isSettled;
        default:
          return true;
      }
    });
  }, [
    data.events,
    data.ledgerEntries,
    data.members,
    data.sharedEventMembers,
    filter,
    query,
  ]);

  const youOwe = filteredEntries.filter(
    (entry) => entry.fromId === "me" && entry.remainingAmount > 0.005,
  );
  const owedToYou = filteredEntries.filter(
    (entry) => entry.toId === "me" && entry.remainingAmount > 0.005,
  );
  const settled = filteredEntries.filter(
    (entry) =>
      entry.remainingAmount <= 0.005 ||
      entry.status === "settled" ||
      entry.paymentStatus === "paid",
  );
  const dueSoonCount = filteredEntries.filter(
    (entry) => entry.dueDate && entry.remainingAmount > 0.005,
  ).length;

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Debts"
        subtitle="See what you owe, what is owed to you, what is due soon, and what is already settled."
        showBackButton={false}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Debt options"
            onPress={openOptions}
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
        <View style={styles.statsRow}>
          <StatCard
            label="Open"
            value={String(youOwe.length + owedToYou.length)}
            subtitle="Balances that still need action"
            tone="indigo"
            compact
            compactDensity="tight"
            withDivider
          />
          <StatCard
            label="Due soon"
            value={String(dueSoonCount)}
            subtitle="Deadlines coming up"
            tone="amber"
            compact
            compactDensity="tight"
            withDivider
          />
          <StatCard
            label="Settled"
            value={String(settled.length)}
            subtitle="Closed out items"
            tone="teal"
            compact
            compactDensity="tight"
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
        sharedEventMembers={data.sharedEventMembers}
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
        sharedEventMembers={data.sharedEventMembers}
      />
      <LedgerSection
        title="Settled"
        subtitle="Finished and paid items."
        entries={settled}
        summaryAmount={sectionTotalLabel(
          settled,
          data.settings,
          data.currencyRates,
        )}
        summaryTone="neutral"
        members={data.members}
        sharedEventMembers={data.sharedEventMembers}
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
  sharedEventMembers,
}: {
  title: string;
  subtitle: string;
  entries: LedgerEntry[];
  summaryAmount: string;
  summaryTone: "positive" | "negative" | "neutral";
  members: Member[];
  sharedEventMembers: SharedEventMember[];
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
      <GlassCard
        tone={
          title === "You owe"
            ? "coral"
            : title === "Settled"
              ? "teal"
              : "lavender"
        }
      >
        <View style={styles.listColumn}>
          {entries.map((entry, index) => (
            <ListRow
              key={entry.id}
              title={entry.title}
              subtitle={
                entry.eventId
                  ? "Shared"
                  : entry.kind === "expense_obligation"
                    ? "Bills"
                    : entryDirectionText(entry, members, sharedEventMembers)
              }
              amount={formatMoney(
                entry.remainingAmount <= 0.005
                  ? entry.originalAmount
                  : entry.remainingAmount,
                entry.currency as CurrencyCode,
              )}
              trailingLabel={debtDueLabel(entry)}
              trailingTone={debtDueTone(entry)}
              icon={entry.eventId ? "people-outline" : "wallet-outline"}
              iconTone={entry.eventId ? "teal" : "indigo"}
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
  {
    label: "Settled",
    value: "settled",
    description: "Finished items that are already paid or closed out.",
  },
];

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
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
