import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/src/presentation/components/controls";

type SummaryHeaderOption<T extends string> = {
  value: T;
  label: string;
};

type SummaryHeaderProps<T extends string> = {
  children: ReactNode;

  filter: T;
  filterOptions: readonly SummaryHeaderOption<T>[];
  onFilterChange: (filter: T) => void;
};

export function SummaryHeader<T extends string>({
  children,
  filter,
  filterOptions,
  onFilterChange,
}: SummaryHeaderProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>

      <View style={styles.filter}>
        <SegmentedControl
          value={filter}
          options={filterOptions}
          onChange={onFilterChange}
          colorScheme="dark"
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
