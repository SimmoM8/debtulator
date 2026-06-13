import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Animated, StyleSheet, Text, View } from "react-native";

import { AvatarStack } from "@/src/components/ui/Finance";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import { Amount } from "@/src/components/ui/Money";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
} from "@/src/components/ui/Primitives";
import {
  palette,
  radii,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";
import {
  debtPdfLines,
  shareExport,
  writePdfExport,
} from "@/src/services/export";
import { buildLedgerEntries } from "@/src/services/ledger";
import { createRemoteDebtVerification } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { DebtStatus } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

export function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const debt = data.debts.find((item) => item.id === id);
  const member = debt
    ? data.members.find((item) => item.id === debt.memberId)
    : undefined;
  const event = debt?.eventId
    ? data.events.find((item) => item.id === debt.eventId)
    : undefined;
  const entry = debt ? buildLedgerEntries([debt], [])[0] : undefined;
  const currentEntry =
    data.ledgerEntries.find(
      (item) => item.kind === "simple_debt" && item.sourceId === id,
    ) ?? entry;

  if (data.loading) {
    return <LoadingState />;
  }

  if (!debt || !entry || !currentEntry) {
    return (
      <Screen>
        <EmptyState
          title="Debt not found"
          body="This debt may have been archived or removed."
        />
      </Screen>
    );
  }

  const currentDebt = debt;
  const paymentLines = data.settlementLines.filter(
    (line) =>
      line.sourceRecordType === "simple_debt" &&
      line.sourceRecordId === currentDebt.id,
  );
  const payments = data.payments.filter((payment) =>
    paymentLines.some((line) => line.paymentId === payment.id),
  );

  const eventParticipants = currentDebt.eventId
    ? data.sharedEventMembers
        .filter(
          (item) =>
            item.eventId === currentDebt.eventId && item.status === "active",
        )
        .map((item) => item.alias ?? item.displayName)
    : [];

  const participantLabels = Array.from(
    new Set([
      "You",
      member?.displayName ?? "Unknown member",
      ...eventParticipants,
    ]),
  );

  const activityItems: ActivityItem[] = [
    {
      id: `created-${currentDebt.id}`,
      title: "Debt created",
      detail: `${currentDebt.amount} ${currentDebt.currency}`,
      createdAt: currentDebt.createdAt,
    },
    ...data.activityLogs
      .filter(
        (activity) =>
          activity.entityKind === "debt" &&
          activity.entityId === currentDebt.id,
      )
      .map((activity) => ({
        id: activity.id,
        title: activity.action.replaceAll("_", " "),
        detail: "Ledger activity",
        createdAt: activity.createdAt,
      })),
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      title: "Payment recorded",
      detail: `${payment.amount} ${payment.currency} · ${payment.status.replaceAll("_", " ")}`,
      createdAt: payment.paymentDate,
    })),
  ].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return (
      (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    );
  });

  async function updateStatus(status: DebtStatus) {
    await data.updateDebt(currentDebt.id, { status });
  }

  function confirmArchiveDebt() {
    Alert.alert(
      "Archive debt?",
      "This removes the debt from active debt views while keeping its ledger history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void updateStatus("archived");
          },
        },
      ],
    );
  }

  async function requestVerification() {
    if (!auth.identity.authenticatedUserId) {
      Alert.alert(
        "Account required",
        "Sign in to request verification from a linked member.",
      );
      return;
    }
    if (!member || member.linkStatus !== "linked" || !member.linkedUserId) {
      Alert.alert(
        "Linked member required",
        "Link this member to a real user before requesting verification.",
      );
      return;
    }

    const remote = await createRemoteDebtVerification({
      debt: currentDebt,
      member,
      requesterUserId: auth.identity.authenticatedUserId,
      responderUserId: member.linkedUserId,
      sharedNotes: currentDebt.sharedNotes ?? currentDebt.notes,
    });

    await data.requestDebtVerification(currentDebt.id, {
      requesterUserId: auth.identity.authenticatedUserId,
      responderUserId: member.linkedUserId,
      remoteDebtId: remote?.remoteDebtId ?? null,
      remoteVerificationId: remote?.remoteVerificationId ?? null,
      sharedNotes: currentDebt.sharedNotes ?? currentDebt.notes,
    });
  }

  async function exportPdf() {
    const relatedSettlements = data.settlements.filter((settlement) =>
      data.settlementLines.some(
        (line) =>
          line.settlementId === settlement.id &&
          line.sourceRecordId === currentDebt.id,
      ),
    );
    const uri = await writePdfExport(
      `debtulator-${currentDebt.title}.pdf`,
      debtPdfLines({
        title: currentDebt.title,
        entries: currentEntry ? [currentEntry] : [],
        payments,
        settlements: relatedSettlements,
        snapshot: data,
        options: {
          includePrivateNotes: data.settings.includePrivateNotesInExports,
          includeComments: data.settings.includeCommentsInExports,
          includeAttachments: data.settings.includeAttachmentsInExports,
          includeRejectedDisputed:
            data.settings.includeRejectedDisputedInExports,
          includeArchived: data.settings.includeArchivedInExports,
        },
      }),
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: "pdf",
      targetType: "debt",
      targetId: currentDebt.id,
      metadata: { uri },
    });
    await shareExport(uri, `${currentDebt.title} PDF`);
  }

  const dueLabel = currentDebt.dueDate
    ? formatDate(currentDebt.dueDate)
    : "No due date";

  const isOwedToMe = currentDebt.direction === "they_owe_me";
  const directionColor = isOwedToMe ? palette.positive : palette.negative;

  const isPartiallyPaid =
    currentEntry.paymentStatus === "partially_paid" &&
    currentEntry.amountPaid > 0;
  const isFullyPaid =
    currentEntry.paymentStatus === "paid" ||
    currentEntry.paymentStatus === "overpaid";
  const dueRelativeLabel = currentDebt.dueDate
    ? isFullyPaid
      ? "Payment complete"
      : formatDueRelative(currentDebt.dueDate)
    : "No deadline has been set";

  const displayAmount = isPartiallyPaid
    ? currentEntry.remainingAmount
    : currentEntry.originalAmount;

  const paidFraction =
    currentEntry.originalAmount > 0
      ? Math.min(currentEntry.amountPaid / currentEntry.originalAmount, 1)
      : 0;

  return (
    <Screen
      footer={
        <View style={styles.footerActions}>
          <Button
            title="Settle up"
            icon="checkmark-circle"
            onPress={() => {
              void updateStatus("settled");
            }}
            disabled={currentDebt.status === "settled"}
            style={styles.footerButton}
          />
          <Button
            title="Add payment"
            icon="card"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/payment/form",
                params: { debtId: currentDebt.id },
              })
            }
            style={styles.footerButton}
          />
        </View>
      }
    >
      <PageHeader
        title={currentDebt.title}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Debt options"
            onPress={() => setOptionsOpen(true)}
          />
        }
      />

      <MobileMenuModal
        visible={optionsOpen}
        title="Debt options"
        onClose={() => setOptionsOpen(false)}
        sections={[
          {
            items: [
              {
                label: "Edit debt",
                subtitle: "Change amount, details, notes, or status",
                icon: "create-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  router.push({
                    pathname: "/debt/form",
                    params: { id: currentDebt.id },
                  });
                },
              },
              {
                label: "Export PDF",
                subtitle: "Create a portable record for this debt",
                icon: "download-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  void exportPdf();
                },
              },
              ...(member?.linkStatus === "linked" &&
              currentDebt.verificationStatus !== "pending"
                ? [
                    {
                      label: "Request verification",
                      subtitle: "Ask the linked member to confirm this debt",
                      icon: "shield-checkmark-outline" as const,
                      onPress: () => {
                        setOptionsOpen(false);
                        void requestVerification();
                      },
                    },
                  ]
                : []),
              ...(currentDebt.status !== "archived"
                ? [
                    {
                      label: "Archive",
                      subtitle: "Hide this debt from active views",
                      icon: "archive-outline" as const,
                      destructive: true,
                      onPress: () => {
                        setOptionsOpen(false);
                        confirmArchiveDebt();
                      },
                    },
                  ]
                : []),
            ],
          },
        ]}
      />

      {/* ── Hero ── */}
      <View style={styles.hero}>
        {/* Participant flow: You always left */}
        <View style={styles.participantFlow}>
          <ParticipantChip label="You" highlight />
          <View style={styles.flowArrowWrap}>
            {isOwedToMe ? (
              <AnimatedFlowArrow
                isOwedToMe={isOwedToMe}
                color={directionColor}
              />
            ) : null}
            <View style={styles.flowArrowLine} />
            {!isOwedToMe ? (
              <AnimatedFlowArrow
                isOwedToMe={isOwedToMe}
                color={directionColor}
              />
            ) : null}
          </View>
          <ParticipantChip
            label={member?.displayName ?? "Them"}
            highlight={false}
          />
        </View>

        {/* Amount */}
        <View style={styles.amountBlock}>
          <Amount
            amount={displayAmount}
            currency={currentDebt.currency}
            size="lg"
            color={directionColor}
          />
          {isPartiallyPaid ? (
            <Text style={styles.amountSubtext}>
              of{" "}
              {formatMoney(currentEntry.originalAmount, currentDebt.currency)}{" "}
              remaining
            </Text>
          ) : isFullyPaid ? (
            <View style={styles.settledPill}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={palette.positive}
              />
              <Text style={styles.settledPillText}>Fully settled</Text>
            </View>
          ) : null}
        </View>

        {/* Payment progress */}
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <AnimatedProgressFill
              paidFraction={paidFraction}
              isFullyPaid={isFullyPaid}
              color={directionColor}
            />
          </View>
          {currentEntry.amountPaid > 0 ? (
            <View style={styles.progressLabels}>
              <View style={styles.progressLabelItem}>
                <View
                  style={[
                    styles.progressDot,
                    { backgroundColor: directionColor },
                  ]}
                />
                <Text style={styles.progressLabelText}>
                  {formatMoney(currentEntry.amountPaid, currentDebt.currency)}{" "}
                  paid
                </Text>
              </View>
              {!isFullyPaid && currentEntry.remainingAmount > 0 ? (
                <View style={styles.progressLabelItem}>
                  <View
                    style={[styles.progressDot, styles.progressDotRemaining]}
                  />
                  <Text style={styles.progressLabelText}>
                    {formatMoney(
                      currentEntry.remainingAmount,
                      currentDebt.currency,
                    )}{" "}
                    remaining
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.dueRow}>
          <View style={styles.dueIcon}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={currentDebt.dueDate ? palette.brand : palette.faint}
            />
          </View>
          <View style={styles.dueCopy}>
            <Text style={styles.dueLabel}>
              {currentDebt.dueDate ? `Due ${dueLabel}` : "No due date"}
            </Text>
            <Text
              style={[
                styles.dueMeta,
                currentDebt.dueDate &&
                  !isFullyPaid &&
                  dueRelativeLabel.includes("overdue") &&
                  styles.dueMetaOverdue,
              ]}
            >
              {dueRelativeLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Details ── */}
      <View style={styles.sectionHeader}>
        <SectionTitle title="Details" />
      </View>
      <Card tone="lavender" style={styles.detailsCard}>
        <DetailRow label="Member" value={member?.displayName ?? "Unknown"} />
        <DetailRow label="Date" value={formatDate(currentDebt.debtDate)} />
        {event ? <DetailRow label="Event" value={event.name} /> : null}
        {participantLabels.length > 2 ? (
          <DetailRow
            label="Participants"
            value={
              <View style={styles.participantsValue}>
                <AvatarStack labels={participantLabels} />
                <Text style={styles.valueMeta}>
                  {participantLabels.length} people
                </Text>
              </View>
            }
          />
        ) : null}
        {currentDebt.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{currentDebt.notes}</Text>
          </View>
        ) : null}
      </Card>

      {/* ── Activity ── */}
      {activityItems.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <SectionTitle title="Activity" />
          </View>
          <Card style={styles.activityCard}>
            {activityItems.map((activity, index) => (
              <ActivityTimelineRow
                key={activity.id}
                item={activity}
                isLast={index === activityItems.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function AnimatedFlowArrow({
  isOwedToMe,
  color,
}: {
  isOwedToMe: boolean;
  color: string;
}) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 480,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: isOwedToMe ? [0, -10] : [0, 10],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 1, 0.35],
  });

  return (
    <Animated.View style={{ transform: [{ translateX }], opacity }}>
      <Ionicons
        name={isOwedToMe ? "arrow-back" : "arrow-forward"}
        size={20}
        color={color}
      />
    </Animated.View>
  );
}

function AnimatedProgressFill({
  paidFraction,
  isFullyPaid,
  color,
}: {
  paidFraction: number;
  isFullyPaid: boolean;
  color: string;
}) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: paidFraction,
      duration: 900,
      delay: 250,
      useNativeDriver: false,
    }).start();
  }, [anim, paidFraction]);

  const animatedWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.progressFill,
        isFullyPaid && styles.progressFillComplete,
        { width: animatedWidth, backgroundColor: color },
      ]}
    />
  );
}

function ParticipantChip({
  label,
  highlight,
}: {
  label: string;
  highlight: boolean;
}) {
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View style={styles.participantChip}>
      <View
        style={[
          styles.participantAvatar,
          highlight
            ? styles.participantAvatarHighlight
            : styles.participantAvatarMuted,
        ]}
      >
        <Text
          style={[
            styles.participantAvatarText,
            highlight && styles.participantAvatarTextHighlight,
          ]}
        >
          {initials}
        </Text>
      </View>
      <Text style={styles.participantName}>{label}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {typeof value === "string" ? (
        <Text style={styles.detailValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function ActivityTimelineRow({
  item,
  isLast,
}: {
  item: ActivityItem;
  isLast: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineTrack}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View
        style={[styles.timelineContent, !isLast && styles.timelineContentGap]}
      >
        <Text style={styles.activityTitle}>{item.title}</Text>
        <View style={styles.activityMeta}>
          <Text style={styles.activityDetail}>{item.detail}</Text>
          <Text style={styles.activityDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

function formatDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDueRelative(input: string) {
  const datePart = input.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(dueDate.getTime()) ||
    dueDate.getFullYear() !== year ||
    dueDate.getMonth() !== month - 1 ||
    dueDate.getDate() !== day
  ) {
    return "Due date set";
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = Math.round(
    (dueDate.getTime() - todayStart.getTime()) / 86_400_000,
  );

  if (days === 0) {
    return "Due today";
  }
  if (days === 1) {
    return "1 day remaining";
  }
  if (days > 1) {
    return `${days} days remaining`;
  }
  if (days === -1) {
    return "1 day overdue";
  }
  return `${Math.abs(days)} days overdue`;
}

const styles = StyleSheet.create({
  // Footer
  footerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },

  // Hero
  hero: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  // Participant flow
  participantFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  participantChip: {
    alignItems: "center",
    gap: spacing.xs,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  participantAvatarHighlight: {
    backgroundColor: palette.blueSoft,
    borderColor: palette.borderIndigo,
  },
  participantAvatarMuted: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
  },
  participantAvatarText: {
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyHeavy,
    color: palette.muted,
  },
  participantAvatarTextHighlight: {
    color: palette.brand,
  },
  participantName: {
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    color: palette.muted,
  },
  flowArrowWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flowArrowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: palette.line,
  },

  // Amount
  amountBlock: {
    gap: spacing.xs,
  },
  amountSubtext: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.body,
  },
  settledPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.positiveSoft,
  },
  settledPillText: {
    color: palette.positive,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },

  // Payment progress
  progressBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: palette.warning,
  },
  progressFillComplete: {
    backgroundColor: palette.positive,
  },
  progressLabels: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  progressLabelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  progressDotRemaining: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  progressLabelText: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  dueIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  dueCopy: {
    gap: 2,
  },
  dueLabel: {
    color: palette.ink,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  dueMeta: {
    color: palette.faint,
    fontSize: typography.size.xs,
    fontFamily: typefaces.body,
  },
  dueMetaOverdue: {
    color: palette.negative,
  },

  // Section headings
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },

  // Details card
  detailsCard: {
    gap: 0,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  detailValue: {
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.body,
    textAlign: "right",
    flex: 1,
  },
  participantsValue: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  valueMeta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  notesBlock: {
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  notesLabel: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  notesText: {
    color: palette.ink,
    fontSize: typography.size.md,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },

  // Activity timeline
  activityCard: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  timelineTrack: {
    alignItems: "center",
    width: 16,
    paddingTop: 5,
  },
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
    marginBottom: 0,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  timelineContentGap: {
    paddingBottom: spacing.xl,
  },
  activityTitle: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
    textTransform: "capitalize",
  },
  activityMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  activityDetail: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
    flex: 1,
  },
  activityDate: {
    color: palette.faint,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
});
