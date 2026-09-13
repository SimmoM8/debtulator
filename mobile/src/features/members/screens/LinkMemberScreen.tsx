import SearchIcon from "@expo/material-symbols/search.xml";
import {
  Text as AndroidText,
  DockedSearchBar,
  Icon,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { BackendError } from "@/src/data/backend/BackendClient";
import { Card } from "@/src/components/cards/Card";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import { MemberSearchResultsList } from "@/src/features/members/components/MemberSearchResultsList";
import { useCreateMemberLinkRequest } from "@/src/features/members/hooks/useCreateMemberLinkRequest";
import { useMember } from "@/src/features/members/hooks/useMember";
import { useUserDiscovery } from "@/src/features/members/hooks/useUserDiscovery";
import { NativeThemeHost, spacing, textStyles, useAppTheme } from "@/src/theme";

export function LinkMemberScreen() {
  const theme = useAppTheme();
  const { memberId: memberIdParam } = useLocalSearchParams<{
    memberId?: string;
  }>();
  const memberId = typeof memberIdParam === "string" ? memberIdParam : null;
  const member = useMember(memberId);
  const [searchQuery, setSearchQuery] = useState("");
  const discovery = useUserDiscovery(
    member.data?.linkedUserId === null ? searchQuery : "",
  );
  const linkRequest = useCreateMemberLinkRequest();
  const hasSearchQuery = searchQuery.trim().length > 0;

  const targetMemberName = member.loading
    ? "Loading member…"
    : (member.data?.displayName ?? "Member unavailable");

  async function selectUser(targetUserId: string) {
    if (!member.data || linkRequest.isCreating) {
      return;
    }

    try {
      await linkRequest.createRequest({
        member: member.data,
        targetUserId,
      });

      Alert.alert(
        "Link request sent",
        `A link request has been sent for ${member.data.displayName}.`,
        [{ text: "OK", onPress: () => router.dismiss() }],
      );
    } catch (error) {
      const message =
        error instanceof BackendError
          ? error.message
          : "The link request couldn’t be sent. Try again.";

      Alert.alert("Couldn’t send link request", message);
    }
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Cancel linking member"
          onPress={() => router.dismiss()}
        />
      </Stack.Toolbar>

      {Platform.OS === "ios" ? (
        <>
          <Stack.SearchBar
            placeholder="Search by name or email"
            placement="integrated"
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

      <View style={[styles.root, { backgroundColor: theme.colors.appBackground }]}>
        {Platform.OS === "android" ? (
          <View style={styles.androidSearch}>
            <NativeThemeHost style={styles.androidSearchHost}>
              <DockedSearchBar
                onQueryChange={setSearchQuery}
                modifiers={[fillMaxWidth()]}
              >
                <DockedSearchBar.Placeholder>
                  <AndroidText>Search by name or email</AndroidText>
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
          items={hasSearchQuery ? discovery.data : []}
          loading={hasSearchQuery && discovery.loading}
          error={discovery.error?.message ?? null}
          disabled={linkRequest.isCreating}
          onRetry={discovery.refresh}
          onPressItem={(targetUserId) => void selectUser(targetUserId)}
          header={
            <View style={styles.target}>
              <Card>
                <View style={styles.targetContent}>
                  <MemberAvatar displayName={targetMemberName} />
                  <View style={styles.targetText}>
                    <Text
                      style={[
                        styles.targetLabel,
                        { color: theme.colors.secondaryText },
                      ]}
                    >
                      Member to link
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.targetName, { color: theme.colors.text }]}
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
                  title: "No users found",
                  message: "Try a different name or email address.",
                }
              : {
                  title: "Search for a user",
                  message: "Search by name or email.",
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
