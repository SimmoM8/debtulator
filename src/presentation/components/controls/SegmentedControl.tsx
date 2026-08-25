import {
  Host as AndroidHost,
  Text as AndroidText,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from "@expo/ui/jetpack-compose";

import { Host as IOSHost, Text as IOSText, Picker } from "@expo/ui/swift-ui";

import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { Platform, StyleSheet, View } from "react-native";

import { nativeTheme, useAppTheme } from "@/src/theme";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  variant?: "default" | "onBrand";
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = "default",
}: SegmentedControlProps<T>) {
  if (Platform.OS === "android") {
    return (
      <AndroidSegmentedControl
        value={value}
        options={options}
        onChange={onChange}
        variant={variant}
      />
    );
  }

  /*
   * Leave iOS exactly on the native SwiftUI segmented Picker.
   * Your iOS implementation already looks correct.
   */
  return (
    <View style={styles.iosContainer}>
      <IOSHost style={styles.iosHost}>
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

function AndroidSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = "default",
}: SegmentedControlProps<T>) {
  const theme = useAppTheme();

  const isOnBrand = variant === "onBrand";

  const activeContainerColor = isOnBrand
    ? nativeTheme.onBrand.selectedContainer
    : theme.colors.controlContainer;

  const activeContentColor = isOnBrand
    ? nativeTheme.onBrand.selectedContent
    : theme.colors.onControlContainer;

  const inactiveContainerColor = isOnBrand
    ? nativeTheme.onBrand.unselectedContainer
    : theme.colors.controlSurface;

  const inactiveContentColor = isOnBrand
    ? nativeTheme.onBrand.unselectedContent
    : theme.colors.onControlSurface;

  const borderColor = isOnBrand
    ? nativeTheme.onBrand.outline
    : theme.colors.outline;

  return (
    <AndroidHost
      seedColor={nativeTheme.seedColor}
      colorScheme={isOnBrand ? "dark" : theme.scheme}
      style={styles.androidHost}
    >
      <SingleChoiceSegmentedButtonRow>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <SegmentedButton
              key={option.value}
              selected={selected}
              onClick={() => {
                onChange(option.value);
              }}
              colors={{
                activeContainerColor,
                activeContentColor,
                activeBorderColor: borderColor,

                inactiveContainerColor,
                inactiveContentColor,
                inactiveBorderColor: borderColor,

                disabledActiveContainerColor: activeContainerColor,
                disabledActiveContentColor: activeContentColor,
                disabledActiveBorderColor: borderColor,

                disabledInactiveContainerColor: inactiveContainerColor,
                disabledInactiveContentColor: inactiveContentColor,
                disabledInactiveBorderColor: borderColor,
              }}
            >
              <SegmentedButton.Label>
                <AndroidText>{option.label}</AndroidText>
              </SegmentedButton.Label>
            </SegmentedButton>
          );
        })}
      </SingleChoiceSegmentedButtonRow>
    </AndroidHost>
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
