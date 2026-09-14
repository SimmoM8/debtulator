import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { BackendError } from "@/src/data/backend/BackendClient";
import { useBackendClient } from "@/src/data/backend/BackendProvider";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/lists/GroupedList";
import { SolidScreen } from "@/src/components/layout/SolidScreen";
import { ListState } from "@/src/components/states/ListState";
import { requestSyncAndWait } from "@/src/data/sync/syncSignal";
import { useMembers } from "@/src/features/members/hooks/useMembers";
import type { Member } from "@/src/features/members/model/Member";
import { acceptMemberLinkRequest } from "@/src/features/members/operations/respondToMemberLinkRequest";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function AcceptMemberLinkRequestScreen() {
  const theme = useAppTheme();
  const backend = useBackendClient();
  const params = useLocalSearchParams<{
    requestId?: string;
    name?: string;
  }>();
  const requestId =
    typeof params.requestId === "string" ? params.requestId : null;
  const requesterName =
    typeof params.name === "string" && params.name.trim()
      ? params.name.trim()
      : "this user";
  const members = useMembers();
  const [accepting, setAccepting] = useState(false);

  const availableMembers = members.data.filter(
    (member) => member.linkedUserId === null,
  );

  function chooseExistingMember(member: Member) {
    if (accepting) {
      return;
    }

    if (member.displayName === requesterName) {
      void accept({
        memberId: member.id,
        useRequesterName: false,
      });
      return;
    }

    Alert.alert(
      "Choose member name",
      `Keep your private name "${member.displayName}" or replace it with "${requesterName}".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Keep "${member.displayName}"`,
          onPress: () => {
            void accept({
              memberId: member.id,
              useRequesterName: false,
            });
          },
        },
        {
          text: `Use "${requesterName}"`,
          onPress: () => {
            void accept({
              memberId: member.id,
              useRequesterName: true,
            });
          },
        },
      ],
    );
  }

  async function accept(input: {
    memberId: string | null;
    useRequesterName: boolean;
  }) {
    if (!backend || !requestId || accepting) {
      return;
    }

    setAccepting(true);

    try {
      await acceptMemberLinkRequest(backend, {
        requestId,
        ...input,
      });

      await requestSyncAndWait();

      Alert.alert(
        "Member linked",
        `You are now linked with ${requesterName}.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "Couldn’t accept request",
        error instanceof BackendError
          ? error.message
          : "The member-link request couldn’t be accepted. Try again.",
      );
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Accept Member Link" }} />

      <SolidScreen>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Link {requesterName}
          </Text>
          <Text
            style={[
              styles.message,
              { color: theme.colors.secondaryText },
            ]}
          >
            Choose an existing unlinked member that represents this user, or
            create a new linked member using their account name.
          </Text>

          <GroupedList>
            <GroupedListSection title="New member" variant="default">
              <GroupedListRow
                label={`Create "${requesterName}"`}
                value="New member"
                trailingIcon="chevron.right"
                variant="default"
                onPress={() => {
                  if (!accepting) {
                    void accept({
                      memberId: null,
                      useRequesterName: true,
                    });
                  }
                }}
              />
            </GroupedListSection>

            <GroupedListSection title="Existing members" variant="default">
              {members.loading || members.error ? (
                <ListState
                  loading={members.loading}
                  error={members.error?.message ?? null}
                  totalCount={members.data.length}
                  visibleCount={availableMembers.length}
                  onRetry={members.refresh}
                  emptyState={{
                    title: "No members",
                  }}
                  errorState={{
                    title: "Couldn’t load members",
                    message: "Try again before accepting this request.",
                  }}
                />
              ) : availableMembers.length > 0 ? (
                availableMembers.map((member) => (
                  <GroupedListRow
                    key={member.id}
                    label={member.displayName}
                    value="Not linked"
                    trailingIcon="chevron.right"
                    variant="default"
                    onPress={() => {
                      chooseExistingMember(member);
                    }}
                  />
                ))
              ) : (
                <View style={styles.empty}>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.secondaryText },
                    ]}
                  >
                    You don’t have any unlinked members to choose from.
                  </Text>
                </View>
              )}
            </GroupedListSection>
          </GroupedList>
        </View>
      </SolidScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    ...textStyles.title,
  },
  message: {
    ...textStyles.body,
  },
  empty: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...textStyles.body,
  },
});
