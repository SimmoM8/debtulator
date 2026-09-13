import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/src/components/cards/Card";
import { SegmentedControl } from "@/src/components/controls/SegmentedControl";
import { SolidScreen } from "@/src/components/layout/SolidScreen";
import { ListState } from "@/src/components/states/ListState";
import { useInboxRequests } from "@/src/features/inbox/hooks/useInboxRequests";
import type {
  RequestInboxItem,
  RequestInboxScope,
} from "@/src/features/inbox/model/RequestInboxItem";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

const SCOPE_OPTIONS = [
  { value: "needs_action", label: "Needs action" },
  { value: "sent", label: "Sent" },
  { value: "history", label: "History" },
] as const;

export function InboxScreen() {
  const theme = useAppTheme();
  const [scope, setScope] = useState<RequestInboxScope>("needs_action");
  const inbox = useInboxRequests(scope);

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

function requestTypeLabel(type: string): string {
  if (type === "member_link") {
    return "Member link";
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
});
