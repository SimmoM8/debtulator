import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { GlassCard } from "@/src/components/ui/Finance";
import {
  IconButton,
  PageHeader,
  SlidingSectionSwitcher,
} from "@/src/components/ui/Primitives";
import {
  palette,
  radii,
  spacing,
} from "@/src/constants/design";

type SummaryTone =
  | "indigo"
  | "teal"
  | "coral"
  | "amber"
  | "peach"
  | "lavender"
  | "muted";

export function CollectionPageControls({
  title,
  addLabel,
  onAdd,
  optionsLabel,
  onOpenOptions,
  query,
  onChangeQuery,
  searchPlaceholder,
  filterValue,
  filterOptions,
  onChangeFilter,
  sortValue,
  sortOptions,
  onChangeSort,
  sortDirection,
  onToggleSortDirection,
  summary,
  summaryTone = "lavender",
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  optionsLabel: string;
  onOpenOptions: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  searchPlaceholder: string;
  filterValue?: string;
  filterOptions?: { label: string; value: string }[];
  onChangeFilter?: (value: string) => void;
  sortValue?: string;
  sortOptions?: { label: string; value: string }[];
  onChangeSort?: (value: string) => void;
  sortDirection?: "asc" | "desc";
  onToggleSortDirection?: () => void;
  summary: React.ReactNode;
  summaryTone?: SummaryTone;
}) {
  const showQuickFilters = Boolean(
    filterValue && filterOptions?.length && onChangeFilter,
  );
  const showSortControls = Boolean(
    sortValue && sortOptions?.length && onChangeSort && onToggleSortDirection,
  );

  return (
    <View style={styles.controls}>
      <PageHeader
        title={title}
        showBackButton={false}
        topLeft={
          <IconButton
            icon="ellipsis-horizontal"
            label={optionsLabel}
            tone="inverse"
            onPress={onOpenOptions}
          />
        }
        topRight={
          <View style={styles.headerActions}>
            <IconButton
              icon="add"
              label={addLabel}
              tone="inverse"
              onPress={onAdd}
            />
          </View>
        }
        search={{
          value: query,
          onChangeText: onChangeQuery,
          placeholder: searchPlaceholder,
        }}
      />

      {showQuickFilters ? (
        <SlidingSectionSwitcher
          compact
          sections={filterOptions!.map((option) => ({
            key: option.value,
            label: option.label,
          }))}
          activeSection={filterValue!}
          onChange={onChangeFilter!}
        />
      ) : null}

      {showSortControls ? (
        <View style={styles.sortControls}>
          <View style={styles.sortSwitcher}>
            <SlidingSectionSwitcher
              compact
              sections={sortOptions!.map((option) => ({
                key: option.value,
                label: option.label,
              }))}
              activeSection={sortValue!}
              onChange={onChangeSort!}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort ${
              sortDirection === "asc" ? "ascending" : "descending"
            }`}
            onPress={onToggleSortDirection}
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
      ) : null}

      <GlassCard
        tone={summaryTone}
        allowOverflow
        style={styles.summaryCard}
        wrapperStyle={styles.summaryCardWrapper}
      >
        {summary}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
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
  summaryCardWrapper: {
    borderRadius: radii.lg,
  },
  summaryCard: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.78,
  },
});
