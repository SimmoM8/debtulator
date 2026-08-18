import { Stack } from "expo-router";

import type { NativeCollectionHeaderProps } from "./NativeCollectionHeader";

export function NativeCollectionHeader({
  addLabel,
  onAdd,
  optionsLabel,
  onOpenOptions,
  onChangeQuery,
  searchPlaceholder,
}: NativeCollectionHeaderProps) {
  return (
    <>
      <Stack.SearchBar
        placeholder={searchPlaceholder}
        hideWhenScrolling
        onChangeText={(event) => onChangeQuery(event.nativeEvent.text)}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="ellipsis"
          accessibilityLabel={optionsLabel}
          onPress={onOpenOptions}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={addLabel}
          onPress={onAdd}
        />
      </Stack.Toolbar>
    </>
  );
}
