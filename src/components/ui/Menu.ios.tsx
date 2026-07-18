import { StyleSheet, Text, View } from "react-native";

import {
    Host,
    Button as SwiftButton,
    Menu as SwiftMenu,
} from "@expo/ui/swift-ui";
import { buttonStyle, controlSize } from "@expo/ui/swift-ui/modifiers";

import { palette } from "@/src/constants/design";

export type MenuOption<T extends string = string> = {
  label: string;
  value: T;
};

export type MenuProps<T extends string = string> = {
  label?: string;
  value: T;
  options: MenuOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
};

export function Menu<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
}: MenuProps<T>) {
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Host>
        <SwiftMenu label={selected?.label ?? placeholder}>
          {options.map((option) => (
            <SwiftButton
              key={option.value}
              label={option.label}
              onPress={() => onChange(option.value)}
              modifiers={[buttonStyle("glass"), controlSize("small")]}
            />
          ))}
        </SwiftMenu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
  },
});
