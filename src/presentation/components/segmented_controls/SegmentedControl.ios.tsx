import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import type { SegmentedControlProps } from "./SegmentedControl.types";

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel = "Segmented control",
  colorScheme,
}: SegmentedControlProps<T>) {
  return (
    <Host colorScheme={colorScheme} style={styles.host}>
      <Picker
        label={accessibilityLabel}
        selection={value}
        onSelectionChange={(selection) => {
          onChange(selection as T);
        }}
        modifiers={[pickerStyle("segmented")]}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
    height: 36,
  },
});
