import {
  Host,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from "@expo/ui/jetpack-compose";
import { StyleSheet } from "react-native";

import { colors } from "@/src/theme";
import type { SegmentedControlProps } from "./SegmentedControl.types";

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  colorScheme,
}: SegmentedControlProps<T>) {
  const isDark = colorScheme === "dark";

  return (
    <Host style={styles.host}>
      <SingleChoiceSegmentedButtonRow>
        {options.map((option) => (
          <SegmentedButton
            key={option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            colors={
              isDark
                ? {
                    activeContainerColor: colors.onDarkBackground,
                    activeContentColor: colors.mainBackground,
                    activeBorderColor: colors.onDarkBackground,
                    inactiveContainerColor: colors.transparent,
                    inactiveContentColor: colors.onDarkBackground,
                    inactiveBorderColor: colors.onDarkBackground,
                  }
                : undefined
            }
          >
            <SegmentedButton.Label>
              <Text>{option.label}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
    height: 48,
  },
});
