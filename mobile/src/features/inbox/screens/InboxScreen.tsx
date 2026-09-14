import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { BackendError } from "@/src/data/backend/BackendClient";
import { useBackendClient } from "@/src/data/backend/BackendProvider";
import { Card } from "@/src/components/cards/Card";
import { SegmentedControl } from "@/src/components/controls/SegmentedControl";
import { SolidScreen } from "@/src/components/layout/SolidScreen";
import { ListState } from "@/src/components/states/ListState";
import { useInboxRequests } from "@/src/features/inbox/hooks/useInboxRequests";
import type {
  RequestInboxItem,
  RequestInboxScope,
} from "@/src/features/inbox/model/RequestInboxItem";
import { rejectMemberLinkRequest } from "@/src/features/members/operations/respondToMemberLinkRequest";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

const SCOPE_OPTIONS = [
  { value: "needs_action", label: "Needs action" },
  { value: "sent", label: "Sent" },
  { value: "history", label: "History" },
] as const;

export function InboxScreen() {
  const theme = useAppTheme();
  const backend = useBackendClient();
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(
    null,
  );
  const [scope, setScope] = useState<RequestInboxScope>("needs_action");
  const inbox = useInboxRequests(scope);

  function openMemberLinkAcceptance(item: RequestInboxItem) {
    if (respondingRequestId) {
      return;
    }

    router.push({
      pathname: "/(main)/inbox/member-link/[requestId]",
      params: {
        requestId: item.requestId,
        name: item.counterpartyName,
      },
    });
  }

  function openDebtRequest(item: RequestInboxItem) {
    router.push({
      pathname: "/(main)/inbox/debt/[requestId]",
      params: {
        requestId: item.requestId,
        name: item.counterpartyName,
      },
    });
  }

  function confirmDecline(item: RequestInboxItem) {
    if (!backend || respondingRequestId) {
      return;
    }

    Alert.alert(
      "Decline member link?",
      `Decline the member-link request from ${item.counterpartyName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            void declineMemberLink(item);
          },
        },
      ],
    );
  }

  async function declineMemberLink(item: RequestInboxItem) {
    if (!backend || respondingRequestId) {
      return;
    }

    setRespondingRequestId(item.requestId);

    try {
      await rejectMemberLinkRequest(backend, item.requestId);
      await inbox.refresh();
    } catch (error) {
      Alert.alert(
        "Couldn’t decline request",
        error instanceof BackendError
          ? error.message
          : "The request couldn’t be updated. Try again.",
      );
    } finally {
      setRespondingRequestId(null);
    }
  }

  return (
    <SolidScreen>
      <View style={styles.content}>
        <SegmentedControl
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={setScope}
        />

        <ListState
          loading={inbox.loading}
          error={inbox.error?.message ?? null}
          totalCount={inbox.data.length}
          visibleCount={inbox.data.length}
          onRetry={inbox.refresh}
          emptyState={emptyState(scope)}
          errorState={{
            title: "Couldn’t load Inbox",
            message: "Check your connection and try again.",
          }}
        />

        {!inbox.loading && !inbox.error ? (
          <View style={styles.requests}>
            {inbox.data.map((item) => (
              <Card key={`${item.type}:${item.requestId}`}>
                <View style={styles.request}>
                  <View style={styles.requestHeader}>
                    <Text
                      numberOfLines={1}
                      style={[styles.name, { color: theme.colors.text }]}
                    >
                      {item.counterpartyName}
                    </Text>
                    <Text
                      style={[
                        styles.status,
                        { color: theme.colors.secondaryText },
                      ]}
                    >
                      {statusLabel(item)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.type,
                      { color: theme.colors.secondaryText },
                    ]}
                  >
                    {requestTypeLabel(item.type)}
                  </Text>

                  <Text
                    style={[
                      styles.message,
                      { color: theme.colors.secondaryText },
                    ]}
                  >
                    {requestMessage(item)}
                  </Text>

                  <Text
                    style={[
                      styles.timestamp,
                      { color: theme.colors.secondaryText },
                    ]}
                  >
                    {formatTimestamp(item.updatedAt)}
                  </Text>

                  {canRespondToMemberLink(item) ? (
                    <View style={styles.actions}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={respondingRequestId !== null}
                        onPress={() => {
                          confirmDecline(item);
                        }}
                        style={({ pressed }) => [
                          styles.action,
                          {
                            backgroundColor: theme.colors.controlSurface,
                            borderColor: theme.colors.outline,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            { color: theme.colors.onControlSurface },
                          ]}
                        >
                          {respondingRequestId === item.requestId
                            ? "Updating…"
                            : "Decline"}
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        disabled={respondingRequestId !== null}
                        onPress={() => {
                          openMemberLinkAcceptance(item);
                        }}
                        style={({ pressed }) => [
                          styles.action,
                          {
                            backgroundColor: theme.colors.controlContainer,
                            borderColor: theme.colors.controlContainer,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            { color: theme.colors.onControlContainer },
                          ]}
                        >
                          Accept
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {item.type === "debt_create" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        openDebtRequest(item);
                      }}
                      style={({ pressed }) => [
                        styles.reviewAction,
                        {
                          backgroundColor: theme.colors.controlSurface,
                          borderColor: theme.colors.outline,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          { color: theme.colors.onControlSurface },
                        ]}
                      >
                        Review request
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : null}
      </View>
    </SolidScreen>
  );
}

function emptyState(scope: RequestInboxScope) {
  switch (scope) {
    case "needs_action":
      return {
        title: "Nothing needs your attention",
        message: "Incoming requests that require a response will appear here.",
      };
    case "sent":
      return {
        title: "No pending requests sent",
        message: "Requests you send to other users will appear here while pending.",
      };
    case "history":
      return {
        title: "No request history",
        message: "Resolved requests will appear here.",
      };
  }
}

function canRespondToMemberLink(item: RequestInboxItem): boolean {
  return (
    item.type === "member_link" &&
    item.direction === "incoming" &&
    item.status === "pending"
  );
}

function requestTypeLabel(type: string): string {
  if (type === "member_link") {
    return "Member link";
  }

  if (type === "debt_create") {
    return "Debt proposal";
  }

  return sentenceCase(type);
}

function requestMessage(item: RequestInboxItem): string {
  if (item.type === "member_link") {
    if (item.status === "pending") {
      return item.direction === "incoming"
        ? "Wants to link a member with you."
        : "Waiting for a response.";
    }

    return `Member link ${sentenceCase(item.status).toLowerCase()}.`;
  }

  if (item.type === "debt_create") {
    if (item.status === "pending") {
      return item.direction === "incoming"
        ? "Proposed a new debt with you."
        : "Waiting for a response to your debt proposal.";
    }

    return `Debt proposal ${sentenceCase(item.status).toLowerCase()}.`;
  }

  return `${requestTypeLabel(item.type)} request.`;
}

function statusLabel(item: RequestInboxItem): string {
  if (item.status === "pending") {
    return item.direction === "incoming" ? "Needs action" : "Pending";
  }

  return sentenceCase(item.status);
}

function sentenceCase(value: string): string {
  const normalized = value.replaceAll("_", " ").trim();

  return normalized.length === 0
    ? "Request"
    : normalized[0].toUpperCase() + normalized.slice(1);
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  requests: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  request: {
    padding: spacing.md,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  name: {
    ...textStyles.headline,
    minWidth: 0,
    flex: 1,
  },
  status: {
    ...textStyles.caption,
  },
  type: {
    ...textStyles.caption,
    marginTop: spacing.xs,
  },
  message: {
    ...textStyles.body,
    marginTop: spacing.sm,
  },
  timestamp: {
    ...textStyles.caption,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  reviewAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    ...textStyles.headline,
  },
  pressed: {
    opacity: 0.7,
  },
});
