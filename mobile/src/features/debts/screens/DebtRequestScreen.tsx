import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { BackendError } from "@/src/data/backend/BackendClient";
import { useBackendClient } from "@/src/data/backend/BackendProvider";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/lists/GroupedList";
import { SolidScreen } from "@/src/components/layout/SolidScreen";
import { ListState } from "@/src/components/states/ListState";
import { createMoney, formatMoney } from "@/src/features/currencies/utils/money";
import { useDebtRequest } from "@/src/features/debts/hooks/useDebtRequest";
import type { DebtRequest } from "@/src/features/debts/model/DebtRequest";
import {
  acceptDebtRequest,
  cancelDebtRequest,
  rejectDebtRequest,
} from "@/src/features/debts/operations/respondToDebtRequest";
import { useMembers } from "@/src/features/members/hooks/useMembers";
import { formatDate, parseDateOnly } from "@/src/lib/dates";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function DebtRequestScreen() {
  const theme = useAppTheme();
  const backend = useBackendClient();
  const params = useLocalSearchParams<{
    requestId?: string;
    name?: string;
  }>();
  const requestId =
    typeof params.requestId === "string" ? params.requestId : null;
  const routeName =
    typeof params.name === "string" && params.name.trim()
      ? params.name.trim()
      : null;
  const request = useDebtRequest(requestId);
  const members = useMembers();
  const [responding, setResponding] = useState(false);

  const counterpartyName = useMemo(() => {
    if (!request.data) {
      return routeName ?? "Linked member";
    }

    return (
      members.data.find(
        (member) => member.linkedUserId === request.data?.userId,
      )?.displayName ??
      routeName ??
      "Linked member"
    );
  }, [members.data, request.data, routeName]);

  async function respond(action: "accept" | "reject" | "cancel") {
    if (!backend || !requestId || responding) {
      return;
    }

    setResponding(true);

    try {
      if (action === "accept") {
        await acceptDebtRequest(backend, requestId);
      } else if (action === "reject") {
        await rejectDebtRequest(backend, requestId);
      } else {
        await cancelDebtRequest(backend, requestId);
      }

      router.back();
    } catch (error) {
      Alert.alert(
        "Couldn’t update request",
        error instanceof BackendError
          ? error.message
          : "The debt request couldn’t be updated. Try again.",
      );
    } finally {
      setResponding(false);
    }
  }

  function confirmReject() {
    Alert.alert(
      "Decline debt proposal?",
      `Decline the debt proposed by ${counterpartyName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            void respond("reject");
          },
        },
      ],
    );
  }

  function confirmCancel() {
    Alert.alert(
      "Cancel debt proposal?",
      "The other user will no longer be able to accept this proposal.",
      [
        { text: "Keep request", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: () => {
            void respond("cancel");
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Debt Request" }} />

      <SolidScreen>
        <View style={styles.content}>
          <ListState
            loading={request.loading}
            error={request.error?.message ?? null}
            totalCount={request.data ? 1 : 0}
            visibleCount={request.data ? 1 : 0}
            onRetry={request.refresh}
            emptyState={{
              title: "Request unavailable",
            }}
            errorState={{
              title: "Couldn’t load request",
              message: "Check your connection and try again.",
            }}
          />

          {request.data ? (
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {request.data.payload.title || "Debt proposal"}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.secondaryText },
                  ]}
                >
                  {proposalSummary(request.data, counterpartyName)}
                </Text>
              </View>

              <GroupedList>
                <GroupedListSection title="Proposal" variant="default">
                  <GroupedListRow
                    label="Amount"
                    value={formatMoney(
                      createMoney(
                        request.data.payload.amount,
                        request.data.payload.currency,
                      ),
                    )}
                    variant="default"
                  />
                  <GroupedListRow
                    label="Direction"
                    value={relationshipLabel(
                      request.data,
                      counterpartyName,
                    )}
                    variant="default"
                  />
                  <GroupedListRow
                    label="Due date"
                    value={dueDateLabel(request.data.payload.dueDate)}
                    variant="default"
                  />
                </GroupedListSection>

                <GroupedListSection title="Request" variant="default">
                  <GroupedListRow
                    label={
                      request.data.direction === "incoming" ? "From" : "To"
                    }
                    value={counterpartyName}
                    variant="default"
                  />
                  <GroupedListRow
                    label="Status"
                    value={statusLabel(request.data.status)}
                    variant="default"
                  />
                </GroupedListSection>
              </GroupedList>

              {request.data.status === "pending" &&
              request.data.direction === "incoming" ? (
                <View style={styles.actions}>
                  <ActionButton
                    label="Decline"
                    disabled={responding}
                    variant="secondary"
                    onPress={confirmReject}
                  />
                  <ActionButton
                    label={responding ? "Updating…" : "Accept"}
                    disabled={responding}
                    variant="primary"
                    onPress={() => {
                      void respond("accept");
                    }}
                  />
                </View>
              ) : null}

              {request.data.status === "pending" &&
              request.data.direction === "outgoing" ? (
                <ActionButton
                  label={responding ? "Updating…" : "Cancel request"}
                  disabled={responding}
                  variant="secondary"
                  onPress={confirmCancel}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </SolidScreen>
    </>
  );
}

type ActionButtonProps = {
  label: string;
  disabled: boolean;
  variant: "primary" | "secondary";
  onPress: () => void;
};

function ActionButton({
  label,
  disabled,
  variant,
  onPress,
}: ActionButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor:
            variant === "primary"
              ? theme.colors.controlContainer
              : theme.colors.controlSurface,
          borderColor:
            variant === "primary"
              ? theme.colors.controlContainer
              : theme.colors.outline,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          {
            color:
              variant === "primary"
                ? theme.colors.onControlContainer
                : theme.colors.onControlSurface,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function proposalSummary(
  request: DebtRequest,
  counterpartyName: string,
): string {
  if (request.direction === "incoming") {
    return `${counterpartyName} proposed a new debt with you.`;
  }

  return `You proposed a new debt with ${counterpartyName}.`;
}

function relationshipLabel(
  request: DebtRequest,
  counterpartyName: string,
): string {
  const creatorDirection = request.payload.direction;
  const direction =
    request.direction === "incoming"
      ? creatorDirection === "you_owe"
        ? "they_owe"
        : "you_owe"
      : creatorDirection;

  return direction === "you_owe"
    ? `You owe ${counterpartyName}`
    : `${counterpartyName} owes you`;
}

function dueDateLabel(value: string | null): string {
  if (!value) {
    return "No due date";
  }

  const date = parseDateOnly(value);
  return date ? formatDate(date) : value;
}

function statusLabel(status: DebtRequest["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...textStyles.title2,
  },
  subtitle: {
    ...textStyles.body,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    ...textStyles.headline,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
