import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import {
    FilterChip,
    GlassCard,
    ListRow,
    SearchBar,
    StatCard,
} from "@/src/components/ui/Finance";
import {
    EmptyState,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { spacing } from "@/src/constants/design";
import { entryDirectionText } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import type {
    CurrencyCode,
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
        action={<AppMenuButton />}
      />

      <GlassCard tone="lavender">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search debts"
        />
        <View style={styles.chipRow}>
          {FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Open"
            value={String(youOwe.length + owedToYou.length)}
            subtitle="Balances that still need action"
            tone="indigo"
          />
          <StatCard
            label="Due soon"
            value={String(dueSoonCount)}
            subtitle="Deadlines coming up"
            tone="amber"
          />
          <StatCard
            label="Settled"
            value={String(settled.length)}
            subtitle="Closed out items"
            tone="teal"
          />
        </View>
      </GlassCard>

      <LedgerSection
        title="You owe"
        subtitle="Things you still need to pay."
        entries={youOwe}
        members={data.members}
        sharedEventMembers={data.sharedEventMembers}
      />
      <LedgerSection
        title="Owed to you"
        subtitle="Things other people still owe you."
        entries={owedToYou}
        members={data.members}
        sharedEventMembers={data.sharedEventMembers}
      />
      <LedgerSection
        title="Settled"
        subtitle="Finished and paid items."
        entries={settled}
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
  members,
  sharedEventMembers,
}: {
  title: string;
  subtitle: string;
  entries: LedgerEntry[];
  members: Member[];
  sharedEventMembers: SharedEventMember[];
}) {
  if (!entries.length) {
    return null;
  }

  return (
    <>
      <SectionTitle title={title} subtitle={subtitle} />
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
          {entries.map((entry) => (
            <ListRow
              key={entry.id}
              title={entry.title}
              subtitle={entryDirectionText(entry, members, sharedEventMembers)}
              amount={formatMoney(
                entry.remainingAmount <= 0.005
                  ? entry.originalAmount
                  : entry.remainingAmount,
                entry.currency as CurrencyCode,
              )}
              status={
                entry.remainingAmount <= 0.005
                  ? "Settled"
                  : entry.dueDate
                    ? "Due soon"
                    : entry.toId === "me"
                      ? "Owed to you"
                      : "You owe"
              }
              statusTone={
                entry.remainingAmount <= 0.005
                  ? "teal"
                  : entry.toId === "me"
                    ? "teal"
                    : entry.dueDate
                      ? "amber"
                      : "coral"
              }
              meta={
                entry.dueDate
                  ? `Due ${entry.dueDate}`
                  : entry.eventId
                    ? "Shared event"
                    : "Standalone"
              }
              icon={entry.eventId ? "people-outline" : "wallet-outline"}
              avatars={participantLabels(entry, members, sharedEventMembers)}
              onPress={() => openEntry(entry)}
            />
          ))}
        </View>
      </GlassCard>
    </>
  );
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

const FILTERS: { label: string; value: DebtFilter }[] = [
  { label: "All", value: "all" },
  { label: "You owe", value: "you-owe" },
  { label: "Owed to you", value: "owed-to-you" },
  { label: "Due soon", value: "due-soon" },
  { label: "Settled", value: "settled" },
];

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statsRow: {
    gap: spacing.sm,
  },
  listColumn: {
    gap: spacing.sm,
  },
});
