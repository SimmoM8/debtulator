import {
  Host as AndroidHost,
  Row as AndroidRow,
  Text as AndroidText,
  ToggleButton,
} from "@expo/ui/jetpack-compose";

import {
  border,
  clip,
  fillMaxHeight,
  fillMaxWidth,
  height,
  Shapes,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";

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

  const selectedContainer =
    variant === "onBrand"
      ? nativeTheme.onBrand.selectedContainer
      : theme.colors.controlContainer;

  const selectedContent =
    variant === "onBrand"
      ? nativeTheme.onBrand.selectedContent
      : theme.colors.onControlContainer;

  const unselectedContainer =
    variant === "onBrand"
      ? nativeTheme.onBrand.unselectedContainer
      : theme.colors.controlSurface;

  const unselectedContent =
    variant === "onBrand"
      ? nativeTheme.onBrand.unselectedContent
      : theme.colors.onControlSurface;

  const outline =
    variant === "onBrand" ? nativeTheme.onBrand.outline : theme.colors.outline;

  return (
    <AndroidHost
      seedColor={nativeTheme.seedColor}
      colorScheme={variant === "onBrand" ? "dark" : theme.scheme}
      style={styles.androidHost}
    >
      <AndroidRow
        verticalAlignment="center"
        modifiers={[fillMaxWidth(), height(40)]}
      >
        {options.map((option, index) => {
          const shape = segmentShape(index, options.length);

          return (
            <ToggleButton
              key={option.value}
              checked={value === option.value}
              onCheckedChange={() => {
                onChange(option.value);
              }}
              colors={{
                checkedContainerColor: selectedContainer,

                checkedContentColor: selectedContent,

                containerColor: unselectedContainer,

                contentColor: unselectedContent,
              }}
              modifiers={[
                weight(1),

                fillMaxHeight(),

                clip(shape),

                border(0.75, outline),
              ]}
            >
              <AndroidText>{option.label}</AndroidText>
            </ToggleButton>
          );
        })}
      </AndroidRow>
    </AndroidHost>
  );
}

function segmentShape(index: number, count: number) {
  const radius = 20;

  if (count === 1) {
    return Shapes.RoundedCorner(radius);
  }

  if (index === 0) {
    return Shapes.RoundedCorner({
      topStart: radius,
      bottomStart: radius,
      topEnd: 0,
      bottomEnd: 0,
    });
  }

  if (index === count - 1) {
    return Shapes.RoundedCorner({
      topStart: 0,
      bottomStart: 0,
      topEnd: radius,
      bottomEnd: radius,
    });
  }

  return Shapes.RoundedCorner(0);
}

const styles = StyleSheet.create({
  androidHost: {
    width: "100%",
    height: 40,
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
