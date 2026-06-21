import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/src/components/ui/Finance";

import {
  palette,
  radii,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";
import type { VerificationStatus } from "@/src/types/models";

export function ActivityTimelineRow({
  title,
  detail,
  createdAt,
  confirmationStatus,
  isLast,
  details = [],
}: {
  title: string;
  detail?: string;
  createdAt: string;
  confirmationStatus?: Extract<VerificationStatus, "pending" | "rejected">;
  isLast: boolean;
  details?: { label: string; value: string }[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, view activity details`}
        onPress={() => setDetailsOpen(true)}
        style={({ pressed }) => [styles.timelineRow, pressed && styles.pressed]}
      >
        <View style={styles.timelineTrack}>
          <View style={styles.timelineDot} />
          {!isLast ? <View style={styles.timelineLine} /> : null}
        </View>
        <View style={styles.timelineContent}>
          <View style={styles.mainContent}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </Text>
              {confirmationStatus ? (
                <View
                  accessibilityLabel={
                    confirmationStatus === "rejected"
                      ? "Change rejected"
                      : "Awaiting confirmation"
                  }
                  style={[
                    styles.confirmationMarker,
                    confirmationStatus === "rejected"
                      ? styles.confirmationMarkerRejected
                      : styles.confirmationMarkerPending,
                  ]}
                >
                  {confirmationStatus === "rejected" ? (
                    <Ionicons name="close" size={9} color={palette.surface} />
                  ) : null}
                </View>
              ) : null}
            </View>
            <Text style={styles.detail} numberOfLines={1} ellipsizeMode="tail">
              {detail || " "}
            </Text>
          </View>
          <View style={styles.dateTime}>
            <Text style={styles.date}>{formatActivityDate(createdAt)}</Text>
            <Text style={styles.time}>{formatActivityTime(createdAt)}</Text>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={detailsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsOpen(false)}
      >
        <Pressable
          accessible={false}
          style={styles.overlay}
          onPress={() => setDetailsOpen(false)}
        >
          <Pressable
            accessible={false}
            style={styles.modalWrapper}
            onPress={(event) => event.stopPropagation()}
          >
            <GlassCard style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeading}>Activity details</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close activity details"
                  hitSlop={8}
                  onPress={() => setDetailsOpen(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={palette.textSecondary}
                  />
                </Pressable>
              </View>
              <Text style={styles.modalTitle}>{title}</Text>
              {detail ? <Text style={styles.modalDetail}>{detail}</Text> : null}
              <View style={styles.detailList}>
                <DetailRow label="Date" value={formatActivityDate(createdAt)} />
                <DetailRow label="Time" value={formatActivityTime(createdAt)} />
                {confirmationStatus ? (
                  <DetailRow
                    label="Status"
                    value={
                      confirmationStatus === "rejected"
                        ? "Rejected"
                        : "Awaiting confirmation"
                    }
                  />
                ) : null}
                {details.map((row) => (
                  <DetailRow key={`${row.label}-${row.value}`} {...row} />
                ))}
              </View>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function formatActivityDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  timelineRow: { flexDirection: "row", gap: spacing.md },
  timelineTrack: { alignItems: "center", width: 16, paddingTop: 5 },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: palette.brand,
    borderWidth: 1.5,
    borderColor: palette.lavender,
  },
  timelineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: palette.line,
    marginTop: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  mainContent: { flex: 1, minWidth: 0, gap: spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  detail: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  confirmationMarker: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  confirmationMarkerPending: {
    width: 8,
    height: 8,
    backgroundColor: palette.warning,
  },
  confirmationMarkerRejected: {
    width: 14,
    height: 14,
    backgroundColor: palette.negative,
  },
  dateTime: { minWidth: 88, alignItems: "flex-end", gap: 2 },
  date: {
    color: palette.faint,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  time: {
    color: palette.faint,
    fontSize: typography.size.xs,
    fontFamily: typefaces.body,
  },
  pressed: { opacity: 0.68 },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.42)",
    padding: spacing.screen,
  },
  modalWrapper: { width: "100%", maxWidth: 420 },
  modalCard: { gap: spacing.lg, padding: spacing.xl },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  modalHeading: {
    color: palette.textPrimary,
    fontSize: typography.size.xl,
    fontFamily: typefaces.displayMedium,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyStrong,
  },
  modalDetail: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.body,
  },
  detailList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  detailValue: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
    textAlign: "right",
  },
});
