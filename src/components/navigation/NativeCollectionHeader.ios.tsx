import { Stack } from "expo-router";

import { IOS_BRANDED_HEADER_SEARCH_OPTIONS } from "@/src/components/ios/NativeNavigationStyle";

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
        {...IOS_BRANDED_HEADER_SEARCH_OPTIONS}
        placeholder={searchPlaceholder}
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
