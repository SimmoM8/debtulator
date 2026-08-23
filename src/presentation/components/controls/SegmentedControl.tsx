import { Platform, StyleSheet, View } from "react-native";

import {
  Host as AndroidHost,
  Text as AndroidText,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from "@expo/ui/jetpack-compose";

import { Host as IOSHost, Text as IOSText, Picker } from "@expo/ui/swift-ui";

import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { colors } from "@/src/theme";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  colorScheme?: "light" | "dark";
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  colorScheme,
}: SegmentedControlProps<T>) {
  if (Platform.OS === "android") {
    const isDark = colorScheme === "dark";

    return (
      <AndroidHost style={styles.androidHost}>
        <SingleChoiceSegmentedButtonRow>
          {options.map((option) => (
            <SegmentedButton
              key={option.value}
              selected={option.value === value}
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
                <AndroidText>{option.label}</AndroidText>
              </SegmentedButton.Label>
            </SegmentedButton>
          ))}
        </SingleChoiceSegmentedButtonRow>
      </AndroidHost>
    );
  }

  return (
    <View style={styles.iosContainer}>
      <IOSHost colorScheme={colorScheme} style={styles.iosHost}>
        <Picker
          label="Segmented control"
          selection={value}
          onSelectionChange={(selection) => {
            onChange(selection as T);
          }}
          modifiers={[pickerStyle("segmented")]}
        >
          {options.map((option) => (
            <IOSText key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </IOSText>
          ))}
        </Picker>
      </IOSHost>
    </View>
  );
}

const styles = StyleSheet.create({
  androidHost: {
    width: "100%",
    height: 48,
  },

  iosContainer: {
    width: "100%",
    height: 36,
    overflow: "hidden",
  },

  iosHost: {
    width: "100%",
    height: 36,
  },
});
