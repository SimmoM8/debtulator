import type { ReactNode } from "react";

import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/src/components/controls";

type FilteringHeroOption<T extends string> = {
  value: T;
  label: string;
};

type FilteringHeroProps<T extends string> = {
  children: ReactNode;

  filter: T;

  filterOptions: readonly FilteringHeroOption<T>[];

  onFilterChange: (filter: T) => void;
};

export function FilteringHero<T extends string>({
  children,
  filter,
  filterOptions,
  onFilterChange,
}: FilteringHeroProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>

      <View style={styles.filter}>
        <SegmentedControl
          value={filter}
          options={filterOptions}
          onChange={onFilterChange}
          variant="onBrand"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",

    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  content: {
    width: "100%",

    alignItems: "center",
  },

  filter: {
    width: "100%",

    marginTop: 20,
  },
});
