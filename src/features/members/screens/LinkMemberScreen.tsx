import SearchIcon from "@expo/material-symbols/search.xml";
import {
  Text as AndroidText,
  DockedSearchBar,
  Icon,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Card } from "@/src/components/cards/Card";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import {
  MemberSearchResultsList,
  type MemberSearchResultItem,
} from "@/src/features/members/components/MemberSearchResultsList";
import { useMember } from "@/src/features/members/hooks/useMember";
import { NativeThemeHost, spacing, textStyles, useAppTheme } from "@/src/theme";

const EMPTY_SEARCH_RESULTS: readonly MemberSearchResultItem[] = [];

export function LinkMemberScreen() {
  const theme = useAppTheme();

  const { memberId: memberIdParam } = useLocalSearchParams<{
    memberId?: string;
  }>();

  const memberId = typeof memberIdParam === "string" ? memberIdParam : null;

  const member = useMember(memberId);
  const [searchQuery, setSearchQuery] = useState("");

  const hasSearchQuery = searchQuery.trim().length > 0;

  const targetMemberName = member.loading
    ? "Loading member…"
    : (member.data?.displayName ?? "Member unavailable");

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

      {Platform.OS === "ios" ? (
        <>
          <Stack.SearchBar
            placeholder="Search by ID, phone or email"
            placement="integrated"
            allowToolbarIntegration
            hideNavigationBar={false}
            hideWhenScrolling={false}
            obscureBackground={false}
            autoCapitalize="none"
            onChangeText={(event) => {
              setSearchQuery(event.nativeEvent.text ?? "");
            }}
          />

          <Stack.Toolbar placement="bottom">
            <Stack.Toolbar.SearchBarSlot />
          </Stack.Toolbar>
        </>
      ) : null}

      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        {Platform.OS === "android" ? (
          <View style={styles.androidSearch}>
            <NativeThemeHost style={styles.androidSearchHost}>
              <DockedSearchBar
                onQueryChange={setSearchQuery}
                modifiers={[fillMaxWidth()]}
              >
                <DockedSearchBar.Placeholder>
                  <AndroidText>Search by ID, phone or email</AndroidText>
                </DockedSearchBar.Placeholder>

                <DockedSearchBar.LeadingIcon>
                  <Icon
                    source={SearchIcon}
                    size={24}
                    contentDescription="Search"
                  />
                </DockedSearchBar.LeadingIcon>
              </DockedSearchBar>
            </NativeThemeHost>
          </View>
        ) : null}

        <MemberSearchResultsList
          items={EMPTY_SEARCH_RESULTS}
          header={
            <View style={styles.target}>
              <Card>
                <View style={styles.targetContent}>
                  <MemberAvatar displayName={targetMemberName} />

                  <View style={styles.targetText}>
                    <Text
                      style={[
                        styles.targetLabel,
                        {
                          color: theme.colors.secondaryText,
                        },
                      ]}
                    >
                      Member to link
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.targetName,
                        {
                          color: theme.colors.text,
                        },
                      ]}
                    >
                      {targetMemberName}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          }
          emptyState={
            hasSearchQuery
              ? {
                  title: "No members found",
                  message: "Try a different ID, phone number or email.",
                }
              : {
                  title: "Search for a member",
                  message: "Search by ID, phone or email.",
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

  androidSearch: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  androidSearchHost: {
    width: "100%",
    height: 56,
  },

  target: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  targetContent: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  targetText: {
    minWidth: 0,
    flex: 1,
    marginLeft: 14,
  },

  targetLabel: {
    ...textStyles.caption,
  },

  targetName: {
    ...textStyles.headline,
    marginTop: 3,
  },
});
