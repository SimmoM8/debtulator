import { StyleSheet, Text, View } from "react-native";

import { FilteringHero } from "@/src/components/hero";
import { textStyles, useAppTheme } from "@/src/theme";

export type MemberFilter = "all" | "linked" | "non_linked";

const FILTERS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "linked",
    label: "Linked",
  },
  {
    value: "non_linked",
    label: "Non-linked",
  },
] as const satisfies readonly {
  value: MemberFilter;
  label: string;
}[];

type MemberSummaryHeaderProps = {
  totalCount: number;
  linkedCount: number;
  nonLinkedCount: number;
  filter: MemberFilter;
  onFilterChange: (filter: MemberFilter) => void;
};

export function MemberSummaryHeader({
  totalCount,
  linkedCount,
  nonLinkedCount,
  filter,
  onFilterChange,
}: MemberSummaryHeaderProps) {
  const theme = useAppTheme();

  return (
    <FilteringHero
      filter={filter}
      filterOptions={FILTERS}
      onFilterChange={onFilterChange}
    >
      <View style={styles.summary}>
        <View style={styles.summaryBlock}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            Linked
          </Text>

          <Text
            style={[
              styles.count,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            {linkedCount}
          </Text>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.onHeroBackground,
            },
          ]}
        />

        <View style={styles.summaryBlock}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            Non-linked
          </Text>

          <Text
            style={[
              styles.count,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            {nonLinkedCount}
          </Text>
        </View>
      </View>

      <View style={styles.total}>
        <Text
          style={[
            styles.totalLabel,
            {
              color: theme.colors.onHeroBackground,
            },
          ]}
        >
          Total members
        </Text>

        <Text
          style={[
            styles.totalCount,
            {
              color: theme.colors.onHeroBackground,
            },
          ]}
        >
          {totalCount}
        </Text>
      </View>
    </FilteringHero>
  );
}

const styles = StyleSheet.create({
  summary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
  },

  summaryBlock: {
    flex: 1,
    alignItems: "center",
  },

  divider: {
    width: 1,
    marginHorizontal: 20,
    opacity: 0.28,
  },

  label: {
    ...textStyles.caption,
    opacity: 0.82,
    textAlign: "center",
  },

  count: {
    ...textStyles.title,
    marginTop: 4,
    textAlign: "center",
  },

  total: {
    alignItems: "center",
    marginTop: 18,
  },

  totalLabel: {
    ...textStyles.caption,
    opacity: 0.72,
  },

  totalCount: {
    ...textStyles.body,
    marginTop: 2,
  },
});
