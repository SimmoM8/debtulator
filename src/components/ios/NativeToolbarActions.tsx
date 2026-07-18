import { Stack } from "expo-router";
import type { SFSymbol } from "sf-symbols-typescript";

export function NativeToolbarAction({
  label,
  icon,
  onPress,
  disabled,
  variant,
}: {
  label: string;
  icon?: SFSymbol;
  onPress: () => void;
  disabled?: boolean;
  variant?: "plain" | "done" | "prominent";
}) {
  return (
    <Stack.Toolbar.Button
      accessibilityLabel={label}
      disabled={disabled}
      icon={icon}
      onPress={onPress}
      variant={variant}
    >
      {label}
    </Stack.Toolbar.Button>
  );
}
