import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  DebtLedgerList,
  debtSectionTotalLabel,
} from "@/src/components/DebtLedgerSection";
import {
    CollectionPageControls,
    CollectionPageHeader,
} from "@/src/components/ui/CollectionPageControls";
import { DebtDirectionIcon } from "@/src/components/ui/DebtDirectionIcon";
import { GlassCard, SingleSelectFilterList } from "@/src/components/ui/Finance";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import {
    EmptyState,
    FilterSheet,
    LoadingState,
    Screen,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces, typography } from "@/src/constants/design";
import { entryDirectionText, participantName } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";

type DebtFilter = "all" | "you-owe" | "owed-to-you" | "due-soon";
type DebtSort = "date" | "amount" | "due" | "title" | "member";
type SortDirection = "asc" | "desc";

export function DebtsScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DebtFilter>("all");
  const [sort, setSort] = useState<DebtSort>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

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
    const filtered = activeMatchedEntries.filter((entry) => {
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

    return [...filtered].sort((first, second) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sort === "title") {
        return direction * first.title.localeCompare(second.title);
      }
      if (sort === "amount") {
        return direction * (first.remainingAmount - second.remainingAmount);
      }
      if (sort === "member") {
        const firstName = participantName(
          first.fromId === "me" ? first.toId : first.fromId,
          data.members,
          data.sharedGroupMembers,
        );
        const secondName = participantName(
          second.fromId === "me" ? second.toId : second.fromId,
          data.members,
          data.sharedGroupMembers,
        );
        const memberComparison = firstName.localeCompare(secondName, undefined, {
          sensitivity: "base",
        });
        return (
          direction *
          (memberComparison || first.title.localeCompare(second.title))
        );
      }
      if (sort === "due") {
        if (!first.dueDate && !second.dueDate) {
          return 0;
        }
        if (!first.dueDate) {
          return 1;
        }
        if (!second.dueDate) {
          return -1;
        }
        return direction * first.dueDate.localeCompare(second.dueDate);
      }
      return direction * first.date.localeCompare(second.date);
    });
  }, [
    activeMatchedEntries,
    data.members,
    data.sharedGroupMembers,
    filter,
    sort,
    sortDirection,
  ]);

  const personalEntries = filteredEntries.filter(
    (entry) =>
      (entry.fromId === "me" || entry.toId === "me") &&
      entry.remainingAmount > 0.005,
  );
  const owingEntries = activeMatchedEntries.filter(
    (entry) => entry.fromId === "me" && entry.remainingAmount > 0.005,
  );
  const owedEntries = activeMatchedEntries.filter(
    (entry) => entry.toId === "me" && entry.remainingAmount > 0.005,
  );
  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen
      headerBackground="primary"
      header={
        <CollectionPageHeader
          title="Debts"
          addLabel="Add debt"
          onAdd={() => router.push("/debt/form")}
          optionsLabel="Debt options"
          onOpenOptions={() => setOptionsOpen(true)}
          query={query}
          onChangeQuery={setQuery}
          searchPlaceholder="Filter debts"
        />
      }
    >
      <GlassCard tone="lavender" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <DebtSummaryMetric
            direction="owing"
            label="Owing"
            count={owingEntries.length}
            total={debtSectionTotalLabel(
              owingEntries,
              data.settings,
              data.currencyRates,
            )}
          />
          <View style={styles.summaryDivider} />
          <DebtSummaryMetric
            direction="owed"
            label="Owed"
            count={owedEntries.length}
            total={debtSectionTotalLabel(
              owedEntries,
              data.settings,
              data.currencyRates,
            )}
          />
        </View>
      </GlassCard>

      <CollectionPageControls
        filterValue={filter}
        filterOptions={FILTERS}
        onChangeFilter={(value) => setFilter(value as DebtFilter)}
        sortValue={sort}
        sortOptions={SORT_OPTIONS}
        onChangeSort={(value) => setSort(value as DebtSort)}
        sortDirection={sortDirection}
        onToggleSortDirection={() =>
          setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
        }
      />

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

      <DebtLedgerList
        entries={personalEntries}
        members={data.members}
        sharedGroupMembers={data.sharedGroupMembers}
      />
      {!personalEntries.length ? (
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

const SORT_OPTIONS: { label: string; value: DebtSort }[] = [
  { label: "Date", value: "date" },
  { label: "Amount", value: "amount" },
  { label: "Due", value: "due" },
  { label: "Title", value: "title" },
  { label: "Member", value: "member" },
];

function DebtSummaryMetric({
  direction,
  label,
  count,
  total,
}: {
  direction: "owing" | "owed";
  label: string;
  count: number;
  total: string;
}) {
  const tone = direction === "owing" ? palette.negative : palette.positive;

  return (
    <View style={styles.summaryMetric}>
      <View style={styles.summaryLabelRow}>
        <DebtDirectionIcon direction={direction} size={14} />
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={[styles.summaryTotal, { color: tone }]} numberOfLines={1}>
        {total}
      </Text>
      <Text style={styles.summaryCount}>
        {count} {count === 1 ? "debt" : "debts"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  summaryMetric: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  summaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryLabel: {
    color: palette.textSecondary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.bodyStrong,
  },
  summaryTotal: {
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.numeric,
  },
  summaryCount: {
    color: palette.textTertiary,
    fontSize: typography.size.xs,
    lineHeight: typography.line.xs,
    fontFamily: typefaces.body,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.borderRow,
  },
});
