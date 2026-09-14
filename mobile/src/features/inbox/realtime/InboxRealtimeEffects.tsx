import { router } from "expo-router";
import { useEffect } from "react";

import { useToast } from "@/src/components/feedback/ToastProvider";
import type { RealtimeEvent } from "@/src/data/realtime/RealtimeEvent";
import { subscribeToRealtimeEvents } from "@/src/data/realtime/realtimeSignal";
import { requestSync } from "@/src/data/sync/syncSignal";
import { openInbox } from "@/src/features/inbox/operations/openInbox";

type InboxRealtimePayload = {
  requestType: string;
  requestId: string;
  counterpartyName: string;
  status: string;
  action: string | null;
};

export function InboxRealtimeEffects() {
  const { showToast } = useToast();

  useEffect(
    () =>
      subscribeToRealtimeEvents((event) => {
        if (
          event.type !== "inbox.request.created" &&
          event.type !== "inbox.request.updated"
        ) {
          return;
        }

        const payload = parseInboxRealtimePayload(event);

        if (!payload) {
          return;
        }

        if (payload.status === "accepted") {
          requestSync();
        }

        const toast = createToast(event, payload);

        if (!toast) {
          return;
        }

        showToast({
          dedupeKey: event.id,
          ...toast,
        });
      }),
    [showToast],
  );

  return null;
}

function createToast(
  event: RealtimeEvent,
  payload: InboxRealtimePayload,
) {
  if (event.type === "inbox.request.created") {
    if (payload.requestType === "member_link") {
      return {
        variant: "info" as const,
        title: "Member link request",
        message: `${payload.counterpartyName} wants to link with you.`,
        actionLabel: "View",
        onAction: () => {
          router.push({
            pathname: "/(main)/inbox/member-link/[requestId]",
            params: {
              requestId: payload.requestId,
              name: payload.counterpartyName,
            },
          });
        },
      };
    }

    if (payload.requestType === "debt") {
      const subject =
        payload.action === "update"
          ? "changes to a debt"
          : payload.action === "delete"
            ? "removing a debt"
            : "a new debt";

      return {
        variant: "info" as const,
        title: "Debt request",
        message: `${payload.counterpartyName} proposed ${subject} with you.`,
        actionLabel: "View",
        onAction: () => {
          router.push({
            pathname: "/(main)/inbox/debt/[requestId]",
            params: {
              requestId: payload.requestId,
              name: payload.counterpartyName,
            },
          });
        },
      };
    }

    return {
      variant: "info" as const,
      title: "New request",
      message: `${payload.counterpartyName} sent you a request.`,
      actionLabel: "Inbox",
      onAction: openInbox,
    };
  }

  if (payload.status === "accepted") {
    return {
      variant: "success" as const,
      title: "Request accepted",
      message: `${payload.counterpartyName} accepted your request.`,
      actionLabel: "Inbox",
      onAction: openInbox,
    };
  }

  if (payload.status === "rejected") {
    return {
      variant: "info" as const,
      title: "Request declined",
      message: `${payload.counterpartyName} declined your request.`,
      actionLabel: "Inbox",
      onAction: openInbox,
    };
  }

  if (payload.status === "cancelled") {
    return {
      variant: "info" as const,
      title: "Request cancelled",
      message: `${payload.counterpartyName} cancelled a request.`,
      actionLabel: "Inbox",
      onAction: openInbox,
    };
  }

  return null;
}

function parseInboxRealtimePayload(
  event: RealtimeEvent,
): InboxRealtimePayload | null {
  const requestType = readString(event.payload.requestType);
  const requestId = readString(event.payload.requestId);
  const counterpartyName = readString(event.payload.counterpartyName);
  const status = readString(event.payload.status);
  const action = readString(event.payload.action);

  if (!requestType || !requestId || !counterpartyName || !status) {
    return null;
  }

  return {
    requestType,
    requestId,
    counterpartyName,
    status,
    action,
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
