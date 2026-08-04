import { Stack } from "expo-router";
import { type ComponentProps } from "react";

export type NativeCollectionMenuAction = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

/**
 * Configures the native UINavigationBar for collection roots. Styling is left
 * to UIKit so the bar, large title, search field, toolbar buttons and Liquid
 * Glass treatment follow the current iOS appearance automatically.
 */
export function NativeCollectionNavigation({
  title,
  searchPlaceholder,
  onSearchChange,
  addAccessibilityLabel,
  onAdd,
  leadingAccessibilityLabel,
  leadingIcon = "arrow.up.arrow.down.circle",
  leadingActions = [],
}: {
  title: string;
  searchPlaceholder: string;
  onSearchChange: (text: string) => void;
  addAccessibilityLabel: string;
  onAdd: () => void;
  leadingAccessibilityLabel?: string;
  leadingIcon?: ComponentProps<typeof Stack.Toolbar.Menu>["icon"];
  leadingActions?: NativeCollectionMenuAction[];
}) {
  return (
    <>
      <Stack.Title large>{title}</Stack.Title>
      <Stack.SearchBar
        placeholder={searchPlaceholder}
        hideWhenScrolling
        onChangeText={(event) => onSearchChange(event.nativeEvent.text)}
      />
      {leadingActions.length ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Menu
            icon={leadingIcon}
            accessibilityLabel={
              leadingAccessibilityLabel ?? "Collection options"
            }
          >
            {leadingActions.map((action) => (
              <Stack.Toolbar.MenuAction
                key={action.label}
                isOn={action.selected}
                onPress={action.onPress}
              >
                {action.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={addAccessibilityLabel}
          onPress={onAdd}
        />
      </Stack.Toolbar>
    </>
  );
}
