import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { componentTokens, spacing, textStyles, useAppTheme } from "@/src/theme";

export type AppButtonVariant = "primary" | "secondary";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: AppButtonProps) {
  const theme = useAppTheme();

  const isPrimary = variant === "primary";
  const inactive = disabled || loading;

  const backgroundColor = isPrimary
    ? theme.colors.controlTint
    : theme.colors.controlSurface;

  const contentColor = isPrimary
    ? theme.colors.onControlTint
    : theme.colors.onControlSurface;

  const borderColor = isPrimary
    ? theme.colors.controlTint
    : theme.colors.outline;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
        },
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: contentColor,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: componentTokens.button.height,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: componentTokens.button.radius,
  },

  label: {
    ...textStyles.headline,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.45,
  },
});
