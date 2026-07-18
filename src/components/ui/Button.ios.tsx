import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Host, Button as SwiftButton } from "@expo/ui/swift-ui";
import {
    buttonStyle,
    controlSize,
    disabled,
} from "@expo/ui/swift-ui/modifiers";

import { palette } from "@/src/constants/design";

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
  const role = variant === "danger" ? "destructive" : "default";
  const buttonVariant =
    variant === "primary" || variant === "danger" ? "glassProminent" : "glass";

  const content = (
    <View style={styles.content}>
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={
            variant === "primary" || variant === "danger"
              ? palette.surface
              : palette.primary
          }
        />
      ) : null}
      <Text style={styles.label}>{title}</Text>
    </View>
  );

  return (
    <View style={style}>
      <Host>
        <SwiftButton
          label={title}
          onPress={isDisabled ? undefined : onPress}
          role={role}
          modifiers={[
            buttonStyle(buttonVariant),
            controlSize("large"),
            ...(isDisabled ? [disabled(true)] : []),
          ]}
        >
          {content}
        </SwiftButton>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: "600",
  },
});
