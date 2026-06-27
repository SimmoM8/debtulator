import React, { useMemo, useState } from "react";
import { View } from "react-native";

import { ActivityTimelineRow } from "@/src/components/ActivityTimelineRow";
import {
  GlassCard,
  SearchFilterBar,
  SingleSelectFilterList,
} from "@/src/components/ui/Finance";
import {
  EmptyState,
  FilterSheet,
  LoadingState,
  PageHeader,
  Screen,
} from "@/src/components/ui/Primitives";
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
type ActivitySort = "newest" | "oldest";

export function ActivityScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<ActivitySort>("newest");
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
      .sort((first, second) =>
        sort === "newest"
          ? second.createdAt.localeCompare(first.createdAt)
          : first.createdAt.localeCompare(second.createdAt),
      );
  }, [auth.identity.authenticatedUserId, data, filter, query, sort]);

  if (data.loading || auth.loading) return <LoadingState />;

  return (
    <Screen>
      <PageHeader
        title="Activity"
        subtitle="Events relevant to you and your shared records."
      />
      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search activity"
        onPressFilter={() => setFiltersOpen(true)}
        filterActive={filter !== "all" || sort !== "newest"}
        filterLabel="Open activity filters and sorting"
      />

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
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
];
