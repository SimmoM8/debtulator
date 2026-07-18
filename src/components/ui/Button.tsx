import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing } from "@/src/constants/design";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  accessibilityState?: React.ComponentProps<
    typeof Pressable
  >["accessibilityState"];
};

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled: isDisabled,
  style,
  accessibilityHint,
  accessibilityState,
}: ButtonProps) {
  const isPrimary = variant === "primary" || variant === "danger";

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(isDisabled) || accessibilityState?.disabled,
      }}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
    >
      <View
        style={[
          styles.button,
          isPrimary ? styles.primary : styles.secondary,
          style,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={isPrimary ? palette.surface : palette.primary}
          />
        ) : null}
        <Text style={[styles.label, isPrimary && styles.labelPrimary]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  primary: {
    backgroundColor: palette.primary,
  },
  secondary: {
    backgroundColor: "rgba(55, 48, 163, 0.08)",
  },
  label: {
    color: palette.primary,
    fontWeight: "600",
  },
  labelPrimary: {
    color: palette.surface,
  },
});
