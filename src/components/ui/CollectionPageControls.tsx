import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
  typefaces,
  typography,
} from "@/src/constants/design";

type SummaryTone =
  | "indigo"
  | "teal"
  | "coral"
  | "amber"
  | "peach"
  | "lavender"
  | "muted";

export function CollectionPageHeader({
  title,
  addLabel,
  onAdd,
  optionsLabel,
  onOpenOptions,
  query,
  onChangeQuery,
  searchPlaceholder,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  optionsLabel: string;
  onOpenOptions: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  searchPlaceholder: string;
}) {
  return (
    <PageHeader
      title={title}
      showBackButton={false}
      topCenter={<Text style={styles.headerTitle}>{title}</Text>}
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
  );
}

export function CollectionPageControls({
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
          <View style={styles.sortDirectionSwitcher}>
            <SlidingSectionSwitcher
              compact
              sections={SORT_DIRECTION_OPTIONS.map((option) => ({
                key: option.value,
                label: option.label,
              }))}
              activeSection={sortDirection!}
              onChange={() => onToggleSortDirection!()}
            />
          </View>
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

CollectionPageControls.displayName = "CollectionPageControls";
CollectionPageHeader.displayName = "CollectionPageHeader";

const styles = StyleSheet.create({
  controls: {
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerTitle: {
    color: palette.surface,
    fontSize: typography.size.h2,
    lineHeight: typography.line.h2,
    fontFamily: typefaces.displayMedium,
    textAlign: "center",
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
  sortDirectionSwitcher: {
    width: 126,
    minWidth: 0,
  },
  summaryCardWrapper: {
    borderRadius: radii.lg,
  },
  summaryCard: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});

const SORT_DIRECTION_OPTIONS: {
  label: string;
  value: "asc" | "desc";
}[] = [
  { label: "Asc", value: "asc" },
  { label: "Desc", value: "desc" },
];
