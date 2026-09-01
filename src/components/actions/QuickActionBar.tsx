import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { textStyles, useAppTheme } from "@/src/theme";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

export type QuickAction = {
  id: string;
  label: string;
  icon: SymbolName;
  onPress: () => void;
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

  const contentColor = isOnBrand
    ? theme.colors.onHeroBackground
    : theme.colors.text;

  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const unavailable = action.disabled || !action.onPress;

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
                    ? "rgba(255, 255, 255, 0.10)"
                    : theme.colors.controlContainer,

                  borderColor: isOnBrand
                    ? "rgba(255, 255, 255, 0.16)"
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
                size={21}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: contentColor,
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
    justifyContent: "space-between",
  },

  action: {
    flex: 1,
    alignItems: "center",
  },

  button: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
  },

  label: {
    ...textStyles.caption,
    marginTop: 7,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.6,
  },

  disabled: {
    opacity: 0.4,
  },
});
