import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radii, spacing } from "@/src/constants/design";
import type {
    DebtStatus,
    DebtVisibility,
    EventStatus,
    MemberLinkStatus,
    SyncStatus,
    VerificationStatus,
} from "@/src/types/models";

export function TagChips({ tags, limit }: { tags: string[]; limit?: number }) {
  const visibleTags = limit ? tags.slice(0, limit) : tags;
  const extraCount = limit && tags.length > limit ? tags.length - limit : 0;

  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {visibleTags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
      {extraCount ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>+{extraCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StatusBadge({ status }: { status: DebtStatus | EventStatus }) {
  const tone =
    status === "settled"
      ? "positive"
      : status === "archived"
        ? "neutral"
        : status === "finalising"
          ? "amber"
          : "blue";
  return <Badge label={statusLabel(status)} tone={tone} />;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone =
    status === "rejected" || status === "disputed"
      ? "negative"
      : status === "verified" || status === "resolved"
        ? "positive"
        : status === "pending"
          ? "amber"
          : "blue";
  return <Badge label={verificationLabel(status)} tone={tone} />;
}

export function LinkStatusBadge({ status }: { status: MemberLinkStatus }) {
  const tone =
    status === "linked"
      ? "positive"
      : status === "invite_pending"
        ? "amber"
        : status === "link_rejected" || status === "link_removed"
          ? "negative"
          : "neutral";
  return <Badge label={linkStatusLabel(status)} tone={tone} />;
}

export function VisibilityBadge({
  visibility,
}: {
  visibility: DebtVisibility;
}) {
  const tone =
    visibility === "private"
      ? "neutral"
      : visibility === "shared_with_involved_member"
        ? "blue"
        : "amber";
  return <Badge label={visibilityLabel(visibility)} tone={tone} />;
}

export function SyncBadge({ status }: { status: SyncStatus }) {
  const tone =
    status === "synced"
      ? "positive"
      : status === "sync_error"
        ? "negative"
        : status === "local_only"
          ? "neutral"
          : "amber";
  return <Badge label={status.replace("_", " ")} tone={tone} />;
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "positive" | "negative" | "amber" | "blue" | "neutral";
}) {
  return (
    <View style={[styles.badge, badgeTone[tone]]}>
      <Text style={[styles.badgeText, badgeTextTone[tone]]}>{label}</Text>
    </View>
  );
}

function statusLabel(status: DebtStatus | EventStatus) {
  return status.replace("_", " ");
}

export function verificationLabel(status: VerificationStatus) {
  return status === "local_only" ? "local only" : status.replace("_", " ");
}

export function linkStatusLabel(status: MemberLinkStatus) {
  switch (status) {
    case "invite_pending":
      return "invite pending";
    case "link_rejected":
      return "link rejected";
    case "link_removed":
      return "link removed";
    default:
      return status;
  }
}

export function visibilityLabel(visibility: DebtVisibility) {
  switch (visibility) {
    case "private":
      return "private";
    case "shared_with_involved_member":
      return "shared";
    case "future_event_shared":
      return "event shared later";
    case "shared_event":
      return "shared event";
  }
}

const badgeTone = StyleSheet.create({
  positive: {
    backgroundColor: palette.positiveSoft,
    borderColor: "rgba(47,191,143,0.2)",
  },
  negative: {
    backgroundColor: palette.negativeSoft,
    borderColor: "rgba(255,107,107,0.24)",
  },
  amber: {
    backgroundColor: palette.amberSoft,
    borderColor: "rgba(245,158,11,0.22)",
  },
  blue: {
    backgroundColor: "rgba(55,48,163,0.12)",
    borderColor: palette.borderIndigoSoft,
  },
  neutral: {
    backgroundColor: palette.surfaceAlt,
    borderColor: palette.borderIndigoSoft,
  },
});

const badgeTextTone = StyleSheet.create({
  positive: { color: palette.positive },
  negative: { color: palette.negative },
  amber: { color: palette.warning },
  blue: { color: palette.brand },
  neutral: { color: palette.muted },
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(253,186,155,0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(253,186,155,0.28)",
    paddingHorizontal: spacing.sm,
    minHeight: 28,
    justifyContent: "center",
  },
  tagText: {
    color: palette.primaryDeep,
    fontSize: 12,
    fontWeight: "800",
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
    letterSpacing: 0.2,
  },
});
