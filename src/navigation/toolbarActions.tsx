import { Stack } from "expo-router";
import type { ComponentProps, ReactElement } from "react";

type ToolbarButtonIcon = ComponentProps<typeof Stack.Toolbar.Button>["icon"];

type RenderToolbarActionOptions = {
  label: string;
  androidIcon: ToolbarButtonIcon;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
};

export function renderToolbarAction({
  label,
  androidIcon,
  accessibilityLabel,
  disabled,
  onPress,
}: RenderToolbarActionOptions): ReactElement {
  if (process.env.EXPO_OS === "ios") {
    return (
      <Stack.Toolbar.Button
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={onPress}
      >
        {label}
      </Stack.Toolbar.Button>
    );
  }

  return (
    <Stack.Toolbar.Button
      icon={androidIcon}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
