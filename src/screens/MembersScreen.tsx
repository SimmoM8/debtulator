import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MemberRow } from "@/src/components/EntityRows";
import {
    Button,
    Card,
    EmptyState,
    FilterSheet,
    FloatingActionButton,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SearchField,
    SectionTitle,
    SelectChips,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { filterMembers } from "@/src/services/filters";
import { useAppData } from "@/src/state/AppDataProvider";
import type { MemberFilters } from "@/src/types/models";

const defaultFilters: MemberFilters = {
  query: "",
  tag: null,
  balanceMode: "all",
  archivedMode: "active",
  sort: "name_asc",
};

export function MembersScreen() {
  const data = useAppData();
  const [filters, setFilters] = useState<MemberFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const tagOptions = useMemo(
    () => [
      { label: "All tags", value: "all" },
      ...data.tags.map((tag) => ({ label: tag.name, value: tag.name })),
    ],
    [data.tags],
  );
  const members = useMemo(
    () => filterMembers(data.members, data.memberBalances, filters),
    [data.memberBalances, data.members, filters],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  const balanceCount = data.members.filter(
    (member) =>
      Math.abs(
        Object.values(data.memberBalances[member.id] ?? {}).reduce(
          (sum, amount) => sum + Math.abs(amount ?? 0),
          0,
        ),
      ) > 0.005,
  ).length;
  const activeFilterCount = countActiveMemberFilters(filters);

  function applyQuickFilter(mode: "active" | "balance" | "archived") {
    setFilters((current) => ({
      ...current,
      balanceMode: mode === "balance" ? "has_balance" : "all",
      archivedMode: mode === "archived" ? "archived" : "active",
    }));
  }

  return (
    <Screen
      floatingAction={
        <FloatingActionButton
          icon="person-add"
          label="Add person"
          onPress={() => router.push("/member/form")}
        />
      }
    >
      <PageHeader
        eyebrow="People"
        title="People"
        subtitle="See who you have balances with, what needs attention, and who is safely linked."
      />

      <View style={styles.searchBlock}>
        <View style={styles.searchLine}>
          <View style={styles.searchFlex}>
            <SearchField
              value={filters.query}
              onChangeText={(query) =>
                setFilters((current) => ({ ...current, query }))
              }
              placeholder="Search people"
            />
          </View>
          <IconButton
            icon="options-outline"
            label="Open filters"
            onPress={() => setFiltersOpen(true)}
          />
        </View>
        <View style={styles.quickFilters}>
          <QuickFilter
            label="Active"
            active={
              filters.archivedMode === "active" && filters.balanceMode === "all"
            }
            onPress={() => applyQuickFilter("active")}
          />
          <QuickFilter
            label="Has balance"
            active={filters.balanceMode === "has_balance"}
            onPress={() => applyQuickFilter("balance")}
          />
          <QuickFilter
            label="Archived"
            active={filters.archivedMode === "archived"}
            onPress={() => applyQuickFilter("archived")}
          />
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryValue}>{members.length}</Text>
          <Text style={styles.summaryLabel}>Shown</Text>
        </View>
        <View>
          <Text style={styles.summaryValue}>{balanceCount}</Text>
          <Text style={styles.summaryLabel}>With balances</Text>
        </View>
      </Card>

      <SectionTitle
        title="People balances"
        subtitle="Native currency balances stay separate."
        action={
          activeFilterCount ? (
            <Button
              title="Clear"
              variant="ghost"
              onPress={() =>
                setFilters({ ...defaultFilters, query: filters.query })
              }
            />
          ) : undefined
        }
      />
      <Card>
        {members.length > 0 ? (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              balance={data.memberBalances[member.id] ?? {}}
              settings={data.settings}
              currencyRates={data.currencyRates}
            />
          ))
        ) : (
          <EmptyState
            title="No people found"
            body="Try another filter or add someone you share expenses with."
            action={
              <Button
                title="Add person"
                icon="person-add"
                onPress={() => router.push("/member/form")}
              />
            }
          />
        )}
      </Card>

      <FilterSheet
        visible={filtersOpen}
        title="Filter people"
        subtitle="Keep the people list focused while preserving advanced filters."
        onClose={() => setFiltersOpen(false)}
      >
        <View style={styles.filterGrid}>
          <SelectChips
            label="Tags"
            value={filters.tag ?? "all"}
            options={tagOptions}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                tag: value === "all" ? null : value,
              }))
            }
          />
          <SelectChips
            label="Balance"
            value={filters.balanceMode}
            options={[
              { label: "All", value: "all" },
              { label: "Has balance", value: "has_balance" },
            ]}
            onChange={(balanceMode) =>
              setFilters((current) => ({ ...current, balanceMode }))
            }
          />
          <SelectChips
            label="Archive"
            value={filters.archivedMode}
            options={[
              { label: "Active", value: "active" },
              { label: "Archived", value: "archived" },
              { label: "All", value: "all" },
            ]}
            onChange={(archivedMode) =>
              setFilters((current) => ({ ...current, archivedMode }))
            }
          />
          <SelectChips
            label="Sort"
            value={filters.sort}
            options={[
              { label: "Name", value: "name_asc" },
              { label: "Balance", value: "balance_desc" },
            ]}
            onChange={(sort) => setFilters((current) => ({ ...current, sort }))}
          />
        </View>
        <View style={styles.sheetActions}>
          <Button
            title="Reset filters"
            variant="secondary"
            onPress={() =>
              setFilters({ ...defaultFilters, query: filters.query })
            }
          />
          <Button title="Show results" onPress={() => setFiltersOpen(false)} />
        </View>
      </FilterSheet>
    </Screen>
  );
}

function QuickFilter({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickFilter,
        active && styles.quickFilterActive,
        pressed && styles.quickFilterPressed,
      ]}
    >
      <Text
        style={[styles.quickFilterText, active && styles.quickFilterTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function countActiveMemberFilters(filters: MemberFilters) {
  return Object.entries(filters).filter(
    ([key, value]) =>
      key !== "query" && value !== defaultFilters[key as keyof MemberFilters],
  ).length;
}

const styles = StyleSheet.create({
  searchBlock: {
    gap: spacing.md,
  },
  searchLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchFlex: {
    flex: 1,
  },
  quickFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickFilter: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    backgroundColor: palette.surfaceGlassElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
  },
  quickFilterActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  quickFilterPressed: {
    opacity: 0.82,
  },
  quickFilterText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  quickFilterTextActive: {
    color: palette.surface,
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.lg,
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typefaces.bodyHeavy,
    textAlign: "center",
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    textAlign: "center",
  },
  filterGrid: {
    gap: spacing.md,
  },
  sheetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
