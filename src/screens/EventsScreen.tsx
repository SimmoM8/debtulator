import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    AvatarStack,
    FilterChip,
    GlassCard,
    SearchBar,
    StatCard,
    StatusPill,
} from "@/src/components/ui/Finance";
import {
    EmptyState,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
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
            icon="add"
            label="Add event"
            onPress={() => router.push("/event/form")}
          />
        }
      />

      <GlassCard tone="peach">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search events"
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
            label="Shared"
            value={String(sharedCount)}
            subtitle="Groups with other people"
            tone="peach"
          />
          <StatCard
            label="Active"
            value={String(activeCount)}
            subtitle="Currently in motion"
            tone="indigo"
          />
          <StatCard
            label="Settled"
            value={String(settledCount)}
            subtitle="Closed out events"
            tone="teal"
          />
        </View>
      </GlassCard>

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
            const firstCurrency = Object.entries(myBalance).find(
              ([, amount]) => Math.abs(amount ?? 0) > 0.005,
            );
            const amountLabel = firstCurrency
              ? formatMoney(firstCurrency[1] ?? 0, firstCurrency[0] as never, {
                  signed: true,
                })
              : "$0";
            const progress = explanation.suggestions.length ? 0.4 : 1;

            return (
              <Pressable
                key={event.id}
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
                  <View style={styles.eventArt}>
                    <DebtulatorOrbitIllustration
                      width={108}
                      height={84}
                      compact
                    />
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

const FILTERS: { label: string; value: EventFilter }[] = [
  { label: "All", value: "all" },
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "Settled", value: "settled" },
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statsRow: {
    gap: spacing.sm,
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
  eventArt: {
    minHeight: 124,
    padding: spacing.lg,
    backgroundColor: "rgba(253,186,155,0.18)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    fontSize: 18,
    fontFamily: typefaces.displayMedium,
  },
  eventMeta: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.body,
  },
  eventAmount: {
    color: palette.primaryDeep,
    fontSize: 16,
    fontFamily: typefaces.bodyHeavy,
  },
  eventNotes: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 12,
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
