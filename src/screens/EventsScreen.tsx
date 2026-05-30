import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
    AvatarStack,
    GlassCard,
    SearchFilterBar,
    SingleSelectFilterList,
    StatCard,
    StatusPill,
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
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import { explainEventSettlement } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { formatMoney } from "@/src/utils/money";

type EventFilter = "all" | "planning" | "active" | "settled";

export function EventsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  function openOptions() {
    Alert.alert("Event options", "Choose an action", [
      {
        text: "Open filters",
        onPress: () => setFilterOpen(true),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const events = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.events.filter((event) => {
      if (event.archived) {
        return false;
      }
      const matchesQuery =
        !normalized ||
        event.name.toLowerCase().includes(normalized) ||
        (event.notes ?? "").toLowerCase().includes(normalized);
      if (!matchesQuery) {
        return false;
      }
      if (filter === "all") {
        return true;
      }
      if (filter === "settled") {
        return event.status === "settled";
      }
      return event.status === filter;
    });
  }, [data.events, filter, query]);

  const sharedCount = data.events.filter(
    (event) => !event.archived && event.visibility === "shared",
  ).length;
  const activeCount = data.events.filter(
    (event) => !event.archived && event.status === "active",
  ).length;
  const settledCount = data.events.filter(
    (event) => !event.archived && event.status === "settled",
  ).length;

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Events"
        subtitle="Trips, households, and group expenses that feel social instead of stressful."
        showBackButton={false}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Event options"
            onPress={openOptions}
          />
        }
      />

      <Button
        title="Add event"
        icon="add"
        onPress={() => router.push("/event/form")}
      />

      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search events"
        onPressFilter={() => setFilterOpen(true)}
        filterActive={filter !== "all"}
        filterLabel="Open event filters"
      />

      <GlassCard tone="peach" allowOverflow>
        <View style={styles.statsRow}>
          <StatCard
            label="Shared"
            value={String(sharedCount)}
            subtitle="Groups with other people"
            tone="peach"
            compact
            compactDensity="tight"
            withDivider
          />
          <StatCard
            label="Active"
            value={String(activeCount)}
            subtitle="Currently in motion"
            tone="indigo"
            compact
            compactDensity="tight"
            withDivider
          />
          <StatCard
            label="Settled"
            value={String(settledCount)}
            subtitle="Closed out events"
            tone="teal"
            compact
            compactDensity="tight"
          />
        </View>
      </GlassCard>

      <FilterSheet
        visible={filterOpen}
        title="Event filters"
        subtitle="Choose which groups and event states appear here."
        onClose={() => setFilterOpen(false)}
      >
        <SingleSelectFilterList
          value={filter}
          options={FILTERS}
          onChange={(value) => {
            setFilter(value as EventFilter);
            setFilterOpen(false);
          }}
        />
      </FilterSheet>

      <SectionTitle
        title="Your groups"
        subtitle="Warm, readable summaries for plans and shared expense spaces."
      />
      {events.length ? (
        <View style={styles.eventColumn}>
          {events.map((event) => {
            const explanation = explainEventSettlement(
              event.id,
              data.ledgerEntries,
            );
            const memberLabels =
              event.visibility === "shared"
                ? data.sharedEventMembers
                    .filter(
                      (member) =>
                        member.eventId === event.id &&
                        member.status !== "merged",
                    )
                    .map((member) => member.alias || member.displayName)
                : data.eventMembers
                    .filter((member) => member.eventId === event.id)
                    .map((member) => member.memberId);
            const myBalance = explanation.participantNets.me ?? {};
            const amountLabel = formatMoney(
              estimateMoneyMap(myBalance, data.settings, data.currencyRates),
              data.settings.baseCurrency,
              { signed: true },
            );
            const progress = explanation.suggestions.length ? 0.4 : 1;

            return (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`${event.name}, ${event.visibility} event, ${event.status}, ${amountLabel}`}
                accessibilityHint={
                  explanation.suggestions.length
                    ? `${explanation.suggestions.length} settlement ideas. Opens event details.`
                    : "Balanced. Opens event details."
                }
                onPress={() =>
                  router.push({
                    pathname: "/event/[id]",
                    params: { id: event.id },
                  })
                }
                style={({ pressed }) => [
                  styles.eventPressable,
                  pressed && styles.pressed,
                ]}
              >
                <GlassCard tone="peach" style={styles.eventCard}>
                  <View style={styles.eventAccentRow}>
                    <StatusPill
                      label={
                        event.status === "finalising"
                          ? "Active"
                          : capitalize(event.status)
                      }
                      tone={
                        event.status === "settled"
                          ? "teal"
                          : event.status === "planning"
                            ? "peach"
                            : "indigo"
                      }
                    />
                    <StatusPill
                      label={
                        event.visibility === "shared" ? "Shared" : "Private"
                      }
                      tone={event.visibility === "shared" ? "teal" : "lavender"}
                    />
                  </View>
                  <View style={styles.eventBody}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventCopy}>
                        <Text style={styles.eventTitle}>{event.name}</Text>
                        <Text style={styles.eventMeta}>
                          {event.createdAt.slice(0, 10)} ·{" "}
                          {event.visibility === "shared"
                            ? "Shared event"
                            : "Private event"}
                        </Text>
                      </View>
                      <Text style={styles.eventAmount}>{amountLabel}</Text>
                    </View>
                    <Text style={styles.eventNotes} numberOfLines={2}>
                      {event.notes ||
                        "Shared plans and expense tracking in one calm thread."}
                    </Text>
                    <View style={styles.eventFooter}>
                      <AvatarStack
                        labels={memberLabels.length ? memberLabels : ["You"]}
                      />
                      <Text style={styles.eventProgress}>
                        {explanation.suggestions.length
                          ? `${explanation.suggestions.length} settlement ideas`
                          : "Balanced"}
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.max(progress * 100, 18)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <GlassCard tone="peach">
          <EmptyState
            title="No events found"
            body="Try another filter or create a shared event from the add button."
          />
        </GlassCard>
      )}
    </Screen>
  );
}

const FILTERS: { label: string; value: EventFilter; description: string }[] = [
  {
    label: "All",
    value: "all",
    description: "Every visible event, no matter where it is in the flow.",
  },
  {
    label: "Planning",
    value: "planning",
    description: "Groups still being organized before money starts moving.",
  },
  {
    label: "Active",
    value: "active",
    description: "Events with ongoing balances and shared activity.",
  },
  {
    label: "Settled",
    value: "settled",
    description: "Closed-out groups with nothing left to sort.",
  },
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  eventColumn: {
    gap: spacing.md,
  },
  eventPressable: {
    borderRadius: 28,
  },
  eventCard: {
    padding: 0,
    overflow: "hidden",
  },
  eventAccentRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  eventBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eventCopy: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xxl,
    fontFamily: typefaces.displayMedium,
  },
  eventMeta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  eventAmount: {
    color: palette.primaryDeep,
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyHeavy,
  },
  eventNotes: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eventProgress: {
    color: palette.primary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(55,48,163,0.1)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});
