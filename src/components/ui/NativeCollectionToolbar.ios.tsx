import {
  Button,
  Host,
  HStack,
  Menu,
  Picker,
  Text,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  glassEffect,
  labelStyle,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import { palette } from "@/src/constants/design";

import type { NativeCollectionToolbarProps } from "./NativeCollectionToolbar";

export function NativeCollectionToolbar({
  filterValue,
  filterOptions,
  onChangeFilter,
  sortValue,
  sortOptions,
  onChangeSort,
  sortDirection,
  onToggleSortDirection,
}: NativeCollectionToolbarProps) {
  const selectedFilter = filterOptions?.find(
    (option) => option.value === filterValue,
  );
  const selectedSort = sortOptions?.find((option) => option.value === sortValue);
  const showFilters = Boolean(
    filterValue && filterOptions?.length && onChangeFilter,
  );
  const showSort = Boolean(sortValue && sortOptions?.length && onChangeSort);
  const showDirection = Boolean(sortDirection && onToggleSortDirection);

  if (!showFilters && !showSort && !showDirection) {
    return null;
  }

  return (
    <Host
      style={styles.host}
      seedColor={palette.primary}
      useViewportSizeMeasurement
      ignoreSafeArea="all"
    >
      <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
        {showFilters ? (
          <Picker
            label="Filter"
            selection={filterValue}
            onSelectionChange={(value) => onChangeFilter?.(value)}
            modifiers={[
              pickerStyle("segmented"),
              frame({ maxWidth: Infinity }),
              glassEffect({
                glass: { variant: "regular", interactive: true },
                shape: "capsule",
              }),
              accessibilityLabel("Filter"),
              accessibilityValue(selectedFilter?.label ?? ""),
            ]}
          >
            {filterOptions!.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        ) : null}

        {showSort ? (
          <Menu
            label="Sort"
            systemImage="arrow.up.arrow.down"
            modifiers={[
              buttonStyle("glass"),
              buttonBorderShape("circle"),
              controlSize("regular"),
              labelStyle("iconOnly"),
              accessibilityLabel("Sort"),
              accessibilityValue(selectedSort?.label ?? ""),
              accessibilityHint("Opens sorting options"),
            ]}
          >
            {sortOptions!.map((option) => (
              <Button
                key={option.value}
                label={option.label}
                systemImage={option.value === sortValue ? "checkmark" : undefined}
                onPress={() => onChangeSort?.(option.value)}
              />
            ))}
          </Menu>
        ) : null}

        {showDirection ? (
          <Button
            label={sortDirection === "asc" ? "Ascending" : "Descending"}
            systemImage={sortDirection === "asc" ? "arrow.up" : "arrow.down"}
            onPress={onToggleSortDirection}
            modifiers={[
              buttonStyle("glass"),
              buttonBorderShape("circle"),
              controlSize("regular"),
              labelStyle("iconOnly"),
              accessibilityLabel(
                sortDirection === "asc"
                  ? "Sort ascending"
                  : "Sort descending",
              ),
              accessibilityHint("Toggles the sort direction"),
            ]}
          />
        ) : null}
      </HStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
    height: 44,
  },
});
