import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActivityTimelineRow } from "@/src/components/ActivityTimelineRow";
import {
  GlassCard,
  SingleSelectFilterList,
} from "@/src/components/ui/Finance";
import {
  EmptyState,
  FilterSheet,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SlidingSectionSwitcher,
} from "@/src/components/ui/Primitives";
import {
  palette,
  radii,
  spacing,
} from "@/src/constants/design";
import {
  activityActorLabel,
  activityCategory,
  activityConfirmationStatus,
  activityDetailRows,
  activityEventSentence,
  activitySummary,
  buildUserActivity,
} from "@/src/services/activity";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

type ActivityFilter = "all" | "debts" | "payments" | "groups" | "account";
type ActivitySort = "date" | "type";
type SortDirection = "asc" | "desc";

export function ActivityScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<ActivitySort>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const events = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return buildUserActivity({
      ...data,
      currentUserId: auth.identity.authenticatedUserId,
    })
      .filter((event) => {
        const actor = activityActorLabel(
          event.actorUserId,
          auth.identity.authenticatedUserId,
          data.profiles,
          data.sharedGroupMembers,
          data.members,
        );
        const matchesFilter =
          filter === "all" || activityCategory(event.targetType) === filter;
        const matchesQuery =
          !normalizedQuery ||
          activityEventSentence(event, {
            currentUserId: auth.identity.authenticatedUserId,
            profiles: data.profiles,
            sharedGroupMembers: data.sharedGroupMembers,
            members: data.members,
          })
            .toLowerCase()
            .includes(normalizedQuery) ||
          actor.toLowerCase().includes(normalizedQuery) ||
          event.targetType.toLowerCase().includes(normalizedQuery);
        return matchesFilter && matchesQuery;
      })
      .sort((first, second) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        if (sort === "type") {
          return direction * first.targetType.localeCompare(second.targetType);
        }
        return direction * first.createdAt.localeCompare(second.createdAt);
      });
  }, [auth.identity.authenticatedUserId, data, filter, query, sort, sortDirection]);

  if (data.loading || auth.loading) return <LoadingState />;

  return (
    <Screen>
      <PageHeader
        title="Activity"
        subtitle="Events relevant to you and your shared records."
        topLeft={
          <IconButton
            icon="ellipsis-horizontal"
            label="Activity options"
            tone="inverse"
            onPress={() => setFiltersOpen(true)}
          />
        }
        search={{
          value: query,
          onChangeText: setQuery,
          placeholder: "Filter activity",
        }}
      />

      <SlidingSectionSwitcher
        compact
        sections={FILTER_OPTIONS.map((option) => ({
          key: option.value,
          label: option.label,
        }))}
        activeSection={filter}
        onChange={(value) => setFilter(value as ActivityFilter)}
      />
      <View style={styles.sortControls}>
        <View style={styles.sortSwitcher}>
          <SlidingSectionSwitcher
            compact
            sections={SORT_OPTIONS.map((option) => ({
              key: option.value,
              label: option.label,
            }))}
            activeSection={sort}
            onChange={(value) => setSort(value as ActivitySort)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort ${
            sortDirection === "asc" ? "ascending" : "descending"
          }`}
          onPress={() =>
            setSortDirection((current) =>
              current === "asc" ? "desc" : "asc",
            )
          }
          style={({ pressed }) => [
            styles.sortDirectionButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={18}
            color={palette.primary}
          />
        </Pressable>
      </View>

      <GlassCard tone="lavender">
        {events.length ? (
          <View>
            {events.map((event, index) => (
              <ActivityTimelineRow
                key={event.id}
                title={activityEventSentence(event, {
                  currentUserId: auth.identity.authenticatedUserId,
                  profiles: data.profiles,
                  sharedGroupMembers: data.sharedGroupMembers,
                  members: data.members,
                })}
                createdAt={event.createdAt}
                detail={activitySummary(event, data)}
                confirmationStatus={activityConfirmationStatus(event)}
                details={activityDetailRows(event)}
                isLast={index === events.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No matching activity"
            body="Try changing your search or filters."
          />
        )}
      </GlassCard>

      <FilterSheet
        visible={filtersOpen}
        title="Activity filters"
        subtitle="Choose an event type and sort order."
        onClose={() => setFiltersOpen(false)}
      >
        <SingleSelectFilterList
          value={filter}
          options={FILTER_OPTIONS}
          onChange={(value) => setFilter(value as ActivityFilter)}
        />
        <SingleSelectFilterList
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => {
            setSort(value as ActivitySort);
            setFiltersOpen(false);
          }}
        />
      </FilterSheet>
    </Screen>
  );
}

const FILTER_OPTIONS = [
  { label: "All activity", value: "all" },
  { label: "Debts", value: "debts" },
  { label: "Payments", value: "payments" },
  { label: "Groups & expenses", value: "groups" },
  { label: "Account & other", value: "account" },
];

const SORT_OPTIONS = [
  { label: "Date", value: "date" },
  { label: "Type", value: "type" },
];

const styles = StyleSheet.create({
  sortControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sortSwitcher: {
    flex: 1,
    minWidth: 0,
  },
  sortDirectionButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  pressed: {
    opacity: 0.78,
  },
});
