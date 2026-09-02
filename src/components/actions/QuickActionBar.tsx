import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { componentTokens, spacing, textStyles, useAppTheme } from "@/src/theme";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

export type QuickAction = {
  id: string;
  label: string;
  icon: SymbolName;
  onPress?: () => void;
  disabled?: boolean;
};

type QuickActionBarProps = {
  actions: readonly QuickAction[];
  variant?: "default" | "onBrand";
};

export function QuickActionBar({
  actions,
  variant = "default",
}: QuickActionBarProps) {
  const theme = useAppTheme();

  const isOnBrand = variant === "onBrand";

  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const unavailable = action.disabled === true || !action.onPress;

        return (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            disabled={unavailable}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.action,

              action.disabled && styles.disabled,

              pressed && !unavailable && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.button,
                {
                  backgroundColor: isOnBrand
                    ? theme.colors.onBrandSurface
                    : theme.colors.controlContainer,

                  borderColor: isOnBrand
                    ? theme.colors.onBrandSurfaceBorder
                    : theme.colors.outline,
                },
              ]}
            >
              <SymbolView
                name={action.icon}
                tintColor={
                  isOnBrand
                    ? theme.colors.onHeroBackground
                    : theme.colors.onControlContainer
                }
                size={componentTokens.quickAction.iconSize}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: isOnBrand
                    ? theme.colors.onHeroBackground
                    : theme.colors.text,
                },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
  },

  action: {
    flex: 1,
    alignItems: "center",
  },

  button: {
    width: componentTokens.quickAction.size,
    height: componentTokens.quickAction.size,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: componentTokens.quickAction.size / 2,

    borderWidth: StyleSheet.hairlineWidth,
  },

  label: {
    ...textStyles.caption,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.6,
  },

  disabled: {
    opacity: 0.4,
  },
});
