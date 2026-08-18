import { Stack, router } from "expo-router";

import type { NativeFormToolbarProps } from "./types";

export function NativeFormToolbar({
  label,
  onPress,
  disabled,
}: NativeFormToolbarProps) {
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="done"
          disabled={disabled}
          onPress={onPress}
        >
          {label}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
