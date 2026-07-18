import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette, radii, spacing } from "@/src/constants/design";

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
      <View style={styles.shell}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              option.value === value && styles.optionActive,
            ]}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {!selected ? <Text style={styles.placeholder}>{placeholder}</Text> : null}
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
  shell: {
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(55,48,163,0.16)",
  },
  option: {
    paddingVertical: spacing.xs,
  },
  optionActive: {
    backgroundColor: "rgba(55,48,163,0.08)",
  },
  optionText: {
    color: palette.ink,
  },
  placeholder: {
    color: palette.textTertiary,
  },
});
