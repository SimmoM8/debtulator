import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    AvatarStack,
    GlassCard,
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
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import { explainGroupSettlement } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { formatMoney } from "@/src/utils/money";

type GroupFilter = "all" | "planning" | "active" | "settled";

export function GroupsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return data.groups.filter((group) => {
      if (group.archived) {
        return false;
      }
      const matchesQuery =
        !normalized ||
        group.name.toLowerCase().includes(normalized) ||
        (group.notes ?? "").toLowerCase().includes(normalized);
      if (!matchesQuery) {
        return false;
      }
      if (filter === "all") {
        return true;
      }
      if (filter === "settled") {
        return group.status === "settled";
      }
      return group.status === filter;
    });
  }, [data.groups, filter, query]);

  const sharedCount = data.groups.filter(
    (group) => !group.archived && group.visibility === "shared",
  ).length;
  const activeCount = data.groups.filter(
    (group) => !group.archived && group.status === "active",
  ).length;
  const settledCount = data.groups.filter(
    (group) => !group.archived && group.status === "settled",
  ).length;

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Groups"
        showBackButton={false}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Group options"
            onPress={() => setOptionsOpen(true)}
          />
        }
      />

      <Button
        title="Add group"
        icon="add"
        onPress={() => router.push("/group/form")}
      />

      <SearchFilterBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search groups"
        onPressFilter={() => setFilterOpen(true)}
        filterActive={filter !== "all"}
        filterLabel="Open group filters"
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
            subtitle="Closed out groups"
            tone="teal"
            compact
            compactDensity="tight"
          />
        </View>
      </GlassCard>

      <FilterSheet
        visible={filterOpen}
        title="Group filters"
        subtitle="Choose which groups and group states appear here."
        onClose={() => setFilterOpen(false)}
      >
        <SingleSelectFilterList
          value={filter}
          options={FILTERS}
          onChange={(value) => {
            setFilter(value as GroupFilter);
            setFilterOpen(false);
          }}
        />
      </FilterSheet>

      <MobileMenuModal
        visible={optionsOpen}
        title="Group options"
        onClose={() => setOptionsOpen(false)}
        sections={[
          {
            items: [
              {
                label: "Open filters",
                subtitle: "Change which groups are shown",
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

      <SectionTitle
        title="Your groups"
        subtitle="Warm, readable summaries for plans and shared expense spaces."
      />
      {groups.length ? (
        <View style={styles.groupColumn}>
          {groups.map((group) => {
            const explanation = explainGroupSettlement(
              group.id,
              data.ledgerEntries,
            );
            const memberLabels =
              group.visibility === "shared"
                ? data.sharedGroupMembers
                    .filter(
                      (member) =>
                        member.groupId === group.id &&
                        member.status !== "merged",
                    )
                    .map((member) => member.alias || member.displayName)
                : data.groupMembers
                    .filter((member) => member.groupId === group.id)
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
                key={group.id}
                accessibilityRole="button"
                accessibilityLabel={`${group.name}, ${group.visibility} group, ${group.status}, ${amountLabel}`}
                accessibilityHint={
                  explanation.suggestions.length
                    ? `${explanation.suggestions.length} settlement ideas. Opens group details.`
                    : "Balanced. Opens group details."
                }
                onPress={() =>
                  router.push({
                    pathname: "/group/[id]",
                    params: { id: group.id },
                  })
                }
                style={({ pressed }) => [
                  styles.groupPressable,
                  pressed && styles.pressed,
                ]}
              >
                <GlassCard tone="peach" style={styles.groupCard}>
                  <View style={styles.groupBody}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupCopy}>
                        <Text style={styles.groupTitle}>{group.name}</Text>
                        <Text style={styles.groupMeta}>
                          {group.createdAt.slice(0, 10)} ·{" "}
                          {group.visibility === "shared"
                            ? "Shared group"
                            : "Private group"}
                        </Text>
                      </View>
                      <Text style={styles.groupAmount}>{amountLabel}</Text>
                    </View>
                    <Text style={styles.groupNotes} numberOfLines={2}>
                      {group.notes ||
                        "Shared plans and expense tracking in one calm thread."}
                    </Text>
                    <View style={styles.groupFooter}>
                      <AvatarStack
                        labels={memberLabels.length ? memberLabels : ["You"]}
                      />
                      <Text style={styles.groupProgress}>
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
            title="No groups found"
            body="Try another filter or create a shared group from the add button."
          />
        </GlassCard>
      )}
    </Screen>
  );
}

const FILTERS: { label: string; value: GroupFilter; description: string }[] = [
  {
    label: "All",
    value: "all",
    description: "Every visible group, no matter where it is in the flow.",
  },
  {
    label: "Planning",
    value: "planning",
    description: "Groups still being organized before money starts moving.",
  },
  {
    label: "Active",
    value: "active",
    description: "Groups with ongoing balances and shared activity.",
  },
  {
    label: "Settled",
    value: "settled",
    description: "Closed-out groups with nothing left to sort.",
  },
];

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  groupColumn: {
    gap: spacing.md,
  },
  groupPressable: {
    borderRadius: 28,
  },
  groupCard: {
    padding: 0,
    overflow: "hidden",
  },
  groupBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  groupCopy: {
    flex: 1,
    gap: 2,
  },
  groupTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xxl,
    fontFamily: typefaces.displayMedium,
  },
  groupMeta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  groupAmount: {
    color: palette.primaryDeep,
    fontSize: typography.size.xl,
    fontFamily: typefaces.bodyHeavy,
  },
  groupNotes: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  groupFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  groupProgress: {
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
