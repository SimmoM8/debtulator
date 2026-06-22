import React from "react";
import { StyleSheet, View } from "react-native";

import { GlassCard, SearchFilterBar } from "@/src/components/ui/Finance";
import { IconButton, PageHeader } from "@/src/components/ui/Primitives";
import { radii, spacing } from "@/src/constants/design";

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
  filterActive,
  filterLabel,
  onOpenFilters,
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
  filterActive: boolean;
  filterLabel: string;
  onOpenFilters: () => void;
  summary: React.ReactNode;
  summaryTone?: SummaryTone;
}) {
  return (
    <View style={styles.controls}>
      <PageHeader
        title={title}
        showBackButton={false}
        action={
          <View style={styles.headerActions}>
            <IconButton icon="add" label={addLabel} onPress={onAdd} />
            <IconButton
              icon="ellipsis-horizontal"
              label={optionsLabel}
              onPress={onOpenOptions}
            />
          </View>
        }
      />

      <SearchFilterBar
        compact
        value={query}
        onChangeText={onChangeQuery}
        placeholder={searchPlaceholder}
        onPressFilter={onOpenFilters}
        filterActive={filterActive}
        filterLabel={filterLabel}
      />

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
