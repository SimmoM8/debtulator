import { router, Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";

import {
  MemberSearchResultsList,
  type MemberSearchResultItem,
} from "@/src/features/members/components/MemberSearchResultsList";

import { useAppTheme } from "@/src/theme";

const EMPTY_SEARCH_RESULTS: readonly MemberSearchResultItem[] = [];

export function LinkMemberScreen() {
  const theme = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");

  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Cancel linking member"
          onPress={() => {
            router.dismiss();
          }}
        />
      </Stack.Toolbar>

      <Stack.SearchBar
        placeholder="Search by name or email"
        placement="stacked"
        hideNavigationBar={false}
        hideWhenScrolling={false}
        obscureBackground={false}
        autoCapitalize="none"
        autoFocus
        inputType="text"
        tintColor={theme.colors.controlTint}
        textColor={theme.colors.text}
        barTintColor={theme.colors.surfaceContainer}
        hintTextColor={theme.colors.placeholder}
        headerIconColor={theme.colors.controlTint}
        onChangeText={(event) => {
          setSearchQuery(event.nativeEvent.text ?? "");
        }}
        onCancelButtonPress={() => {
          setSearchQuery("");
        }}
        onClose={() => {
          setSearchQuery("");
        }}
      />

      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        <MemberSearchResultsList
          items={EMPTY_SEARCH_RESULTS}
          emptyState={
            hasSearchQuery
              ? {
                  title: "No members found",
                  message: "Try a different name or email address.",
                }
              : {
                  title: "Search for a member",
                  message: "Search by name or email address.",
                }
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
