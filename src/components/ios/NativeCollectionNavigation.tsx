import { Stack } from "expo-router";
import { type ComponentProps } from "react";

import { iosBrand } from "@/src/theme/iosBrand";

export type NativeCollectionMenuAction = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

const IOS_BRANDED_HEADER_TITLE = "#FFFFFF";

/**
 * Configures the native UINavigationBar for collection roots. This component
 * emits only Expo Router Stack configuration and never renders a header view.
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
      <Stack.Header
        largeStyle={{
          backgroundColor: iosBrand.navigationScrollEdgeBackground,
          shadowColor: "transparent",
        }}
      />
      <Stack.Title
        large
        largeStyle={{ color: IOS_BRANDED_HEADER_TITLE }}
      >
        {title}
      </Stack.Title>
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
