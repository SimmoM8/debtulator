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
import { renameMember } from "@/src/features/members/operations/renameMember";
import {
  MIN_USER_DISCOVERY_QUERY_LENGTH,
  useUserDiscovery,
} from "@/src/features/members/hooks/useUserDiscovery";
import { NativeThemeHost, spacing, textStyles, useAppTheme } from "@/src/theme";

const SEARCH_PLACEHOLDER = "Search username, name, email or phone";

export function LinkMemberScreen() {
  const theme = useAppTheme();
  const { memberId: memberIdParam } = useLocalSearchParams<{
    memberId?: string;
  }>();
  const memberId = typeof memberIdParam === "string" ? memberIdParam : null;
  const member = useMember(memberId);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const discovery = useUserDiscovery(
    member.data?.linkedUserId === null ? searchQuery : "",
  );
  const linkRequest = useCreateMemberLinkRequest();
  const queryLength = searchQuery.trim().length;
  const hasSearchQuery = queryLength > 0;
  const canSearch = queryLength >= MIN_USER_DISCOVERY_QUERY_LENGTH;

  const targetMemberName = member.loading
    ? "Loading member…"
    : (member.data?.displayName ?? "Member unavailable");

  function selectUser(targetUserId: string) {
    if (!member.data || linkRequest.isCreating || submitting) {
      return;
    }

    const targetUser = discovery.data.find((user) => user.id === targetUserId);

    if (!targetUser) {
      return;
    }

    const memberName = member.data.displayName;
    const accountName = targetUser.displayName;

    Alert.alert(
      "Choose member name",
      `Keep your current private member name or change it to ${accountName} before sending the request.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: `Keep "${memberName}"`,
          onPress: () => {
            void sendLinkRequest(targetUserId, null);
          },
        },
        {
          text: `Use "${accountName}"`,
          onPress: () => {
            void sendLinkRequest(targetUserId, accountName);
          },
        },
      ],
    );
  }

  async function sendLinkRequest(
    targetUserId: string,
    replacementDisplayName: string | null,
  ) {
    if (!member.data || linkRequest.isCreating || submitting) {
      return;
    }

    let requestMember = member.data;
    let renamed = false;

    setSubmitting(true);

    try {
      if (
        replacementDisplayName &&
        replacementDisplayName !== requestMember.displayName
      ) {
        requestMember = await renameMember(
          requestMember,
          replacementDisplayName,
        );
        renamed = true;
      }

      await linkRequest.createRequest({
        member: requestMember,
        targetUserId,
      });

      Alert.alert(
        "Link request sent",
        `A link request has been sent for ${requestMember.displayName}.`,
        [{ text: "OK", onPress: () => router.dismiss() }],
      );
    } catch (error) {
      let message =
        error instanceof BackendError
          ? error.message
          : "The link request couldn’t be sent. Try again.";

      if (renamed) {
        message += `\n\nThe member name was changed to ${requestMember.displayName} and has been kept.`;
      }

      Alert.alert("Couldn’t send link request", message);
    } finally {
      setSubmitting(false);
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
            placeholder={SEARCH_PLACEHOLDER}
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
                  <AndroidText>{SEARCH_PLACEHOLDER}</AndroidText>
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
          items={canSearch ? discovery.data : []}
          loading={canSearch && discovery.loading}
          error={canSearch ? discovery.error?.message ?? null : null}
          disabled={linkRequest.isCreating || submitting}
          onRetry={discovery.refresh}
          onPressItem={selectUser}
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
            !hasSearchQuery
              ? {
                  title: "Search for a user",
                  message: "Search by username, name, exact email, or exact phone number.",
                }
              : !canSearch
                ? {
                    title: "Keep typing",
                    message: `Enter at least ${MIN_USER_DISCOVERY_QUERY_LENGTH} characters.`,
                  }
                : {
                    title: "No users found",
                    message: "Try a different username, name, email address, or phone number.",
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
