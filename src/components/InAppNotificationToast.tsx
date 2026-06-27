import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  palette,
  shadows,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";
import { notificationEnabled, privacySafeNotificationBody } from "@/src/services/notifications";
import { useAppData } from "@/src/state/AppDataProvider";
import type { AppNotification, CurrencyCode, DebtDirection } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

export type NotificationRoutingData = ReturnType<typeof useAppData>;

export function InAppNotificationToast() {
  const data = useAppData();
  const insets = useSafeAreaInsets();
  const seenIds = useRef<Set<string> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleNotification, setVisibleNotification] =
    useState<AppNotification | null>(null);

  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(data.notifications.map((item) => item.id));
      return;
    }

    const nextNotification = data.notifications
      .filter(
        (notification) =>
          !seenIds.current?.has(notification.id) &&
          !notification.readAt &&
          notificationEnabled(notification.type, data.settings),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    for (const notification of data.notifications) {
      seenIds.current.add(notification.id);
    }

    if (!nextNotification) {
      return;
    }

    setVisibleNotification(nextNotification);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setVisibleNotification(null);
      timeoutRef.current = null;
    }, 7500);
  }, [data.notifications, data.settings]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  if (!visibleNotification) {
    return null;
  }

  const copy = notificationToastCopy(visibleNotification, data);

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${visibleNotification.title}. Open notifications.`}
        onPress={() => {
          setVisibleNotification(null);
          openNotificationTarget(visibleNotification, data);
        }}
        style={styles.toast}
      >
        <View style={styles.accent} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {copy.title}
          </Text>
          <Text numberOfLines={2} style={styles.body}>
            {copy.body}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  toast: {
    width: "100%",
    maxWidth: 520,
    minHeight: 76,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor:
      Platform.OS === "android" ? palette.surface : palette.surfaceGlassStrong,
    ...shadows.card,
    flexDirection: "row",
    overflow: "hidden",
  },
  accent: {
    width: 5,
    backgroundColor: palette.brand,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  title: {
    color: palette.ink,
    fontFamily: typefaces.bodyHeavy,
    fontSize: typography.size.md,
  },
  body: {
    color: palette.muted,
    fontFamily: typefaces.body,
    fontSize: typography.size.sm,
    lineHeight: typography.line.md,
  },
});

function notificationToastCopy(
  notification: AppNotification,
  data: NotificationRoutingData,
) {
  const metadata = notification.metadata;
  const kind = stringValue(metadata.notificationKind);
  const remoteTargetId = stringValue(metadata.remoteTargetId);
  const debt = notification.targetType === "debt"
    ? data.debts.find(
        (item) =>
          item.id === notification.targetId ||
          (remoteTargetId && item.remoteId === remoteTargetId),
      )
    : null;
  const payment = notification.targetType === "payment"
    ? data.payments.find(
        (item) =>
          item.id === notification.targetId ||
          (remoteTargetId && item.remoteId === remoteTargetId),
      )
    : null;

  if (kind?.includes("confirmation") || kind?.includes("counterproposal")) {
    const requestType = stringValue(metadata.requestType);
    const status = stringValue(metadata.status);
    const actorName = displayNameForUser(
      data,
      stringValue(metadata.actorUserId),
      stringValue(metadata.actorDisplayName),
    );
    const counterpartyName = displayNameForUser(
      data,
      stringValue(metadata.counterpartyUserId),
      stringValue(metadata.counterpartyDisplayName),
    );

    if (notification.type === "verification_request") {
      const amount = amountValue(metadata.amount) ?? debt?.amount ?? 0;
      const currency = currencyValue(metadata.currency) ?? debt?.currency ?? "SEK";
      const direction = directionValue(metadata.direction) ?? debt?.direction;
      const amountLabel = formatMoney(amount, currency);
      const title =
        kind === "confirmation_request_sent"
          ? `${counterpartyName} needs to review your debt`
          : requestType === "amendment" || kind === "counterproposal"
            ? `${actorName} wants to update a debt with you`
            : `${actorName} wants to create a debt with you`;
      const body =
        kind === "confirmation_request_sent"
          ? debtDirectionText(direction, counterpartyName, amountLabel, "sender")
          : debtDirectionText(direction, actorName, amountLabel, "recipient");
      return { title, body };
    }

    if (notification.type === "verification_result") {
      const amount = amountValue(metadata.amount) ?? debt?.amount ?? 0;
      const currency = currencyValue(metadata.currency) ?? debt?.currency ?? "SEK";
      const amountLabel = formatMoney(amount, currency);
      if (kind === "debt_counterproposal_sent") {
        return {
          title: `${counterpartyName} needs to review your counterproposal`,
          body: `Debt amount: ${amountLabel}`,
        };
      }
      if (kind === "debt_confirmation_response_sent") {
        return {
          title: status === "rejected" ? "You rejected the debt" : "You confirmed the debt",
          body: `${counterpartyName}: ${amountLabel}`,
        };
      }
      return {
        title: status === "rejected" ? `${actorName} rejected your debt` : `${actorName} confirmed your debt`,
        body: `Debt amount: ${amountLabel}`,
      };
    }

    if (notification.type === "payment") {
      const amount = amountValue(metadata.amount) ?? payment?.amount ?? 0;
      const currency = currencyValue(metadata.currency) ?? payment?.currency ?? "SEK";
      const amountLabel = formatMoney(amount, currency);
      if (kind === "payment_confirmation_request_sent") {
        return {
          title: `${counterpartyName} needs to review your payment`,
          body: `Payment amount: ${amountLabel}`,
        };
      }
      if (kind === "payment_confirmation_response_sent") {
        return {
          title: status === "rejected" ? "You rejected the payment" : "You confirmed the payment",
          body: `${counterpartyName}: ${amountLabel}`,
        };
      }
      if (kind === "payment_confirmation_response") {
        return {
          title: status === "rejected" ? `${actorName} rejected your payment` : `${actorName} confirmed your payment`,
          body: `Payment amount: ${amountLabel}`,
        };
      }
      return {
        title: `${actorName} wants to confirm a payment with you`,
        body: `Payment amount: ${amountLabel}`,
      };
    }
  }

  return {
    title: notification.title,
    body: privacySafeNotificationBody(notification, data.settings),
  };
}

function debtDirectionText(
  direction: DebtDirection | undefined,
  name: string,
  amount: string,
  perspective: "recipient" | "sender",
) {
  if (perspective === "sender") {
    return direction === "i_owe_them"
      ? `You owe ${name} ${amount}`
      : `${name} owes you ${amount}`;
  }
  return direction === "i_owe_them"
    ? `${name} owes you ${amount}`
    : `You owe ${name} ${amount}`;
}

function displayNameForUser(
  data: NotificationRoutingData,
  userId: string | undefined,
  fallback: string | undefined,
) {
  if (fallback && fallback !== "A linked member") {
    return fallback;
  }
  if (userId) {
    const member = data.members.find((item) => item.linkedUserId === userId);
    if (member?.displayName) {
      return member.displayName;
    }
    const profile = data.profiles.find((item) => item.id === userId);
    if (profile?.displayName) {
      return profile.displayName;
    }
  }
  return fallback ?? "A linked member";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function amountValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function currencyValue(value: unknown): CurrencyCode | undefined {
  return value === "SEK" ||
    value === "AUD" ||
    value === "EUR" ||
    value === "USD" ||
    value === "GBP"
    ? value
    : undefined;
}

function directionValue(value: unknown): DebtDirection | undefined {
  return value === "they_owe_me" || value === "i_owe_them" ? value : undefined;
}

export function openNotificationTarget(
  notification: AppNotification,
  data: NotificationRoutingData,
) {
  const metadata = notification.metadata;
  const kind = stringValue(metadata.notificationKind);
  const localDebtId =
    notification.targetType === "debt" ? notification.targetId : null;
  const localPaymentId =
    notification.targetType === "payment" ? notification.targetId : null;
  const remoteTargetId = stringValue(metadata.remoteTargetId);
  const debt =
    (localDebtId ? data.debts.find((item) => item.id === localDebtId) : null) ??
    (remoteTargetId ? data.debts.find((item) => item.remoteId === remoteTargetId) : null);
  const payment =
    (localPaymentId ? data.payments.find((item) => item.id === localPaymentId) : null) ??
    (remoteTargetId ? data.payments.find((item) => item.remoteId === remoteTargetId) : null);

  if (notification.targetType === "sync_conflict" && notification.targetId) {
    router.push(`/conflict/${notification.targetId}` as never);
    return;
  }

  if (notification.type === "verification_request" || notification.type === "verification_result") {
    if (debt) {
      const requestType = stringValue(metadata.requestType);
      const opensCreationReview =
        notification.type === "verification_request" &&
        requestType === "creation";
      router.push({
        pathname: "/debt/[id]",
        params: {
          id: debt.id,
          ...(opensCreationReview
            ? { review: "creation" }
            : { section: "confirmation" }),
          verificationId: stringValue(metadata.verificationId) ?? "",
          verificationRemoteId: stringValue(metadata.verificationRemoteId) ?? "",
        },
      });
      return;
    }
    router.push("/requests");
    return;
  }

  if (notification.type === "payment") {
    if (payment) {
      router.push({
        pathname: "/payment/[id]",
        params: {
          id: payment.id,
          paymentRemoteId: stringValue(metadata.paymentRemoteId) ?? "",
        },
      });
      return;
    }
    router.push(kind?.includes("confirmation") ? "/requests" : "/notifications");
    return;
  }

  if (notification.type === "group_invite" || notification.type === "claim_request") {
    router.push("/requests");
    return;
  }

  if (notification.targetType === "debt" && debt) {
    router.push({ pathname: "/debt/[id]", params: { id: debt.id } });
    return;
  }

  if (notification.targetId) {
    switch (notification.targetType) {
      case "member":
        router.push({ pathname: "/member/[id]", params: { id: notification.targetId } });
        return;
      case "group":
        router.push({ pathname: "/group/[id]", params: { id: notification.targetId } });
        return;
      case "settlement":
        router.push({ pathname: "/settlement/[id]", params: { id: notification.targetId } });
        return;
      case "attachment":
        router.push({ pathname: "/attachment/[id]", params: { id: notification.targetId } });
        return;
      case "shared_expense":
        router.push({ pathname: "/expense/[id]", params: { id: notification.targetId } });
        return;
      case "sync_conflict":
        router.push(`/conflict/${notification.targetId}` as never);
        return;
      default:
        break;
    }
  }

  if (notification.type === "export_ready") {
    router.push("/export");
    return;
  }

  if (notification.type === "duplicate_warning" || notification.type === "group_update") {
    router.push("/groups");
    return;
  }

  router.push("/notifications");
}
