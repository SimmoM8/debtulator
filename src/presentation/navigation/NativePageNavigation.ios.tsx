import { Stack } from "expo-router";

import type { NativeNavigationAction, NativePageNavigationProps } from "./types";

function systemIcon(icon?: string) {
  const icons: Record<string, string> = {
    "ellipsis-horizontal": "ellipsis.circle",
    "create-outline": "square.and.pencil",
    "cloud-upload": "square.and.arrow.up",
    "checkmark-done": "checkmark",
    "git-compare": "arrow.triangle.branch",
    repeat: "repeat",
  };
  return icon ? (icons[icon] ?? icon) : undefined;
}

function ToolbarButton({ action }: { action: NativeNavigationAction }) {
  return (
    <Stack.Toolbar.Button
      accessibilityLabel={action.label}
      disabled={action.disabled}
      icon={systemIcon(action.icon) as never}
      onPress={action.onPress}
    >
      {action.icon ? undefined : action.label}
    </Stack.Toolbar.Button>
  );
}

/**
 * Keeps navigation-system concerns out of shared page bodies. The rendered
 * cards, rows, forms, and sections remain ordinary shared React components.
 */
export function NativePageNavigation({
  search,
  leadingAction,
  trailingAction,
}: NativePageNavigationProps) {
  return (
    <>
      {search ? (
        <Stack.SearchBar
          placeholder={search.placeholder}
          hideWhenScrolling
          onChangeText={(event) => search.onChangeText(event.nativeEvent.text)}
        />
      ) : null}
      {leadingAction ? (
        <Stack.Toolbar placement="left">
          <ToolbarButton action={leadingAction} />
        </Stack.Toolbar>
      ) : null}
      {trailingAction ? (
        <Stack.Toolbar placement="right">
          <ToolbarButton action={trailingAction} />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
