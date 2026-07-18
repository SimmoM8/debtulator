import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  DebtLedgerSection,
  debtSectionTotalLabel,
} from "@/src/components/DebtLedgerSection";
import {
  GlassCard,
  SingleSelectFilterList,
  StatCard,
} from "@/src/components/ui/Finance";
import { CollectionPageControls } from "@/src/components/ui/CollectionPageControls";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import {
  EmptyState,
  FilterSheet,
  LoadingState,
  Screen,
} from "@/src/components/ui/Primitives";
import { entryDirectionText } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";

type DebtFilter = "all" | "you-owe" | "owed-to-you" | "due-soon";

export function DebtsScreen() {
  const data = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DebtFilter>("all");
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
      <CollectionPageControls
        title="Debts"
        addLabel="Add debt"
        onAdd={() => router.push("/debt/form")}
        optionsLabel="Debt options"
        onOpenOptions={() => setOptionsOpen(true)}
        query={query}
        onChangeQuery={setQuery}
        searchPlaceholder="Search debts"
        onOpenFilters={() => setFilterOpen(true)}
        filterActive={filter !== "all"}
        filterLabel="Open debt filters"
        summary={
          <View style={styles.statsRow}>
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
                setFilter((current) =>
                  current === "you-owe" ? "all" : "you-owe"
                )
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
                  current === "owed-to-you" ? "all" : "owed-to-you"
                )
              }
              accessibilityHint="Shows debts owed to you"
            />
          </View>
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

      <DebtLedgerSection
        title="You owe"
        subtitle="Things you still need to pay."
        entries={youOwe}
        summaryAmount={debtSectionTotalLabel(
          youOwe,
          data.settings,
          data.currencyRates,
        )}
        summaryTone="negative"
        members={data.members}
        sharedGroupMembers={data.sharedGroupMembers}
      />
      <DebtLedgerSection
        title="Owed to you"
        subtitle="Things other people still owe you."
        entries={owedToYou}
        summaryAmount={debtSectionTotalLabel(
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
  },
});
