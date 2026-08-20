import {
  Button,
  Host,
  HStack,
  Image,
  Picker,
  Text,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  frame,
  glassEffect,
  pickerStyle,
  scaleEffect,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import { palette } from "@/src/presentation/theme/design";

import type { NativeCollectionToolbarProps } from "./NativeCollectionToolbar";

export function NativeCollectionToolbar({
  sortValue,
  sortOptions,
  onChangeSort,
  sortDirection,
  onToggleSortDirection,
}: NativeCollectionToolbarProps) {
  const selectedSort = sortOptions?.find((option) => option.value === sortValue);
  const showSort = Boolean(sortValue && sortOptions?.length && onChangeSort);
  const showDirection = Boolean(sortDirection && onToggleSortDirection);

  if (!showSort && !showDirection) {
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
        {showSort ? (
          <Picker
            label="Sort"
            selection={sortValue}
            onSelectionChange={(value) => onChangeSort?.(value)}
            modifiers={[
              pickerStyle("segmented"),
              frame({ maxWidth: Infinity }),
              glassEffect({
                glass: { variant: "regular", interactive: true },
                shape: "capsule",
              }),
              accessibilityLabel("Sort by"),
              accessibilityValue(selectedSort?.label ?? ""),
            ]}
          >
            {sortOptions!.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        ) : null}

        {showDirection ? (
          <Button
            onPress={onToggleSortDirection}
            modifiers={[
              buttonStyle("plain"),
              frame({ width: 44, height: 44 }),
              accessibilityLabel(
                sortDirection === "asc"
                  ? "Sort ascending"
                  : "Sort descending",
              ),
              accessibilityHint("Toggles the sort direction"),
            ]}
          >
            <HStack spacing={1}>
              <Image
                systemName={sortDirection === "asc" ? "arrow.up" : "arrow.down"}
                size={13}
              />
              <Image
                systemName="line.3.horizontal.decrease"
                size={15}
                modifiers={
                  sortDirection === "asc"
                    ? [scaleEffect({ x: 1, y: -1 })]
                    : undefined
                }
              />
            </HStack>
          </Button>
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
