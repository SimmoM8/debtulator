import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
import type { CurrencyCode, DebtStatus } from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";
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
  const [settlingUp, setSettlingUp] = useState(false);
  const debt = data.debts.find((item) => item.id === id);
  const member = debt
    ? data.members.find((item) => item.id === debt.memberId)
    : undefined;
  const event = debt?.eventId
    ? data.events.find((item) => item.id === debt.eventId)
    : undefined;
  const currentEntry = debt
    ? buildLedgerEntries(
        [debt],
        [],
        [],
        data.settlementLines,
        data.payments,
        data.overpaymentCredits,
      )[0]
    : undefined;

  if (data.loading) {
    return <LoadingState />;
  }

  if (!debt || !currentEntry) {
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
  const debtEntry = currentEntry;
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

  function activityActorName(actorUserId: string | null) {
    if (
      !actorUserId ||
      actorUserId === auth.identity.authenticatedUserId
    ) {
      return "You";
    }

    const actorMember = data.members.find(
      (item) => item.linkedUserId === actorUserId,
    );
    if (actorMember) {
      return actorMember.displayName;
    }

    const sharedActor = data.sharedEventMembers.find(
      (item) => item.linkedUserId === actorUserId,
    );
    if (sharedActor) {
      return sharedActor.alias ?? sharedActor.displayName;
    }

    return (
      data.profiles.find((profile) => profile.id === actorUserId)?.displayName ??
      "Someone"
    );
  }

  const activityItems: ActivityItem[] = [
    {
      id: `created-${currentDebt.id}`,
      title: "You created the debt",
      detail: formatMoney(currentDebt.amount, currentDebt.currency),
      createdAt: currentDebt.createdAt,
    },
    ...data.activityLogs
      .filter(
        (activity) =>
          activity.entityKind === "debt" &&
          activity.entityId === currentDebt.id,
      )
      .map((activity) => {
        const actor = activityActorName(activity.actorUserId);
        const description = describeDebtActivity(
          activity.action,
          activity.metadata,
          currentDebt.currency,
        );
        return {
          id: activity.id,
          title: `${actor} ${description.phrase}`,
          detail: description.detail,
          createdAt: activity.createdAt,
        };
      }),
    ...payments.map((payment) => {
      const appliedAmount = paymentLines
        .filter((line) => line.paymentId === payment.id)
        .reduce((total, line) => total + line.appliedAmount, 0);
      return {
        id: `payment-${payment.id}`,
        title: `${activityActorName(payment.createdByUserId)} recorded a payment`,
        detail: `${formatMoney(appliedAmount, currentDebt.currency)} applied · ${payment.status.replaceAll("_", " ")}`,
        createdAt: payment.createdAt,
      };
    }),
  ].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    const chronologicalOrder =
      (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    return chronologicalOrder || b.id.localeCompare(a.id);
  });

  async function updateStatus(status: DebtStatus) {
    await data.updateDebt(
      currentDebt.id,
      { status },
      auth.identity.authenticatedUserId,
    );
  }

  async function settleUp() {
    if (settlingUp || debtEntry.remainingAmount <= 0.005) {
      return;
    }

    setSettlingUp(true);
    try {
      await data.createPaymentSettlement({
        payerId: debtEntry.fromId,
        payeeId: debtEntry.toId,
        amount: debtEntry.remainingAmount,
        currency: debtEntry.currency,
        paymentDate: todayIsoDate(),
        notes: "Settled from debt details",
        relatedMemberId: currentDebt.memberId,
        visibility: currentDebt.visibility,
        createdByUserId: auth.identity.authenticatedUserId,
        lines: [
          {
            sourceRecordType: "simple_debt",
            sourceRecordId: currentDebt.id,
            appliedAmount: debtEntry.remainingAmount,
          },
        ],
        settlementType: "manual",
      });
    } catch {
      Alert.alert(
        "Could not settle debt",
        "The payment could not be recorded. Please try again.",
      );
    } finally {
      setSettlingUp(false);
    }
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

  const isFullyPaid =
    currentEntry.paymentStatus === "paid" ||
    currentEntry.paymentStatus === "overpaid";
  const dueRelativeLabel = currentDebt.dueDate
    ? isFullyPaid
      ? "Payment complete"
      : formatDueRelative(currentDebt.dueDate)
    : "No deadline has been set";

  const displayAmount = currentEntry.remainingAmount;
  const paidFraction = isFullyPaid
    ? 1
    : currentEntry.originalAmount > 0
      ? Math.min(currentEntry.amountPaid / currentEntry.originalAmount, 1)
      : 0;
  const progressRemainingAmount = isFullyPaid
    ? 0
    : currentEntry.remainingAmount;
  const progressBalanceLabel =
    currentEntry.overpaidAmount > 0
      ? `${formatMoney(currentEntry.overpaidAmount, currentDebt.currency)} overpaid`
      : `${formatMoney(progressRemainingAmount, currentDebt.currency)} remaining`;

  return (
    <Screen
      footer={
        <View style={styles.footerActions}>
          <Button
            title={settlingUp ? "Settling..." : "Settle up"}
            icon="checkmark-circle"
            onPress={() => {
              void settleUp();
            }}
            disabled={
              currentDebt.status === "archived" ||
              currentEntry.remainingAmount <= 0.005 ||
              settlingUp
            }
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
            onPress={
              member
                ? () =>
                    router.push({
                      pathname: "/member/[id]",
                      params: { id: member.id },
                    })
                : undefined
            }
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
          {!isFullyPaid ? (
            <Text style={styles.amountSubtext}>
              of{" "}
              {formatMoney(currentEntry.originalAmount, currentDebt.currency)}{" "}
              original
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
              color={directionColor}
            />
          </View>
          <View style={styles.progressLabels}>
            <View style={styles.progressLabelItem}>
              <View
                style={[
                  styles.progressDot,
                  { backgroundColor: directionColor },
                ]}
              />
              <Text style={styles.progressLabelText}>
                {formatMoney(currentEntry.amountPaid, currentDebt.currency)} paid
              </Text>
            </View>
            <View style={styles.progressLabelItem}>
              {currentEntry.overpaidAmount > 0 ? (
                <View
                  style={[
                    styles.progressDot,
                    { backgroundColor: directionColor },
                  ]}
                />
              ) : (
                <View
                  style={[styles.progressDot, styles.progressDotRemaining]}
                />
              )}
              <Text style={styles.progressLabelText}>
                {progressBalanceLabel}
              </Text>
            </View>
          </View>
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
  color,
}: {
  paidFraction: number;
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
        { width: animatedWidth, backgroundColor: color },
      ]}
    />
  );
}

function ParticipantChip({
  label,
  highlight,
  onPress,
}: {
  label: string;
  highlight: boolean;
  onPress?: () => void;
}) {
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `View ${label} details` : undefined}
      disabled={!onPress}
      hitSlop={onPress ? 8 : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.participantChip,
        pressed && styles.participantChipPressed,
      ]}
    >
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
    </Pressable>
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
          {item.detail ? (
            <Text style={styles.activityDetail}>{item.detail}</Text>
          ) : null}
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

function describeDebtActivity(
  action: string,
  metadata: Record<string, unknown>,
  fallbackCurrency: CurrencyCode,
) {
  const nextValue = metadata.nextValue;
  const previousValue = metadata.previousValue;
  const addedTags = stringArray(metadata.addedTags);
  const removedTags = stringArray(metadata.removedTags);

  switch (action) {
    case "debt_due_date_added":
      return {
        phrase: "added a due date",
        detail: typeof nextValue === "string" ? formatDate(nextValue) : "",
      };
    case "debt_due_date_changed":
      return {
        phrase: "changed the due date",
        detail:
          typeof previousValue === "string" && typeof nextValue === "string"
            ? `${formatDate(previousValue)} → ${formatDate(nextValue)}`
            : "",
      };
    case "debt_due_date_removed":
      return { phrase: "removed the due date", detail: "" };
    case "debt_tag_added":
      return {
        phrase: addedTags.length === 1 ? "added a tag" : "added tags",
        detail: addedTags.join(", "),
      };
    case "debt_tag_removed":
      return {
        phrase: removedTags.length === 1 ? "removed a tag" : "removed tags",
        detail: removedTags.join(", "),
      };
    case "debt_tags_updated":
      return {
        phrase: "updated the tags",
        detail: [
          addedTags.length ? `Added ${addedTags.join(", ")}` : "",
          removedTags.length ? `Removed ${removedTags.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "debt_notes_added":
      return { phrase: "added notes", detail: "" };
    case "debt_notes_updated":
      return { phrase: "updated the notes", detail: "" };
    case "debt_notes_removed":
      return { phrase: "removed the notes", detail: "" };
    case "debt_shared_notes_added":
      return { phrase: "added shared notes", detail: "" };
    case "debt_shared_notes_updated":
      return { phrase: "updated the shared notes", detail: "" };
    case "debt_shared_notes_removed":
      return { phrase: "removed the shared notes", detail: "" };
    case "debt_title_changed":
      return {
        phrase: "changed the title",
        detail: typeof nextValue === "string" ? nextValue : "",
      };
    case "debt_amount_changed": {
      const currency =
        typeof metadata.currency === "string"
          ? (metadata.currency as CurrencyCode)
          : fallbackCurrency;
      return {
        phrase: "changed the amount",
        detail:
          typeof previousValue === "number" && typeof nextValue === "number"
            ? `${formatMoney(previousValue, currency)} → ${formatMoney(nextValue, currency)}`
            : typeof nextValue === "number"
              ? formatMoney(nextValue, currency)
            : "",
      };
    }
    case "debt_currency_changed":
      return {
        phrase: "changed the currency",
        detail: typeof nextValue === "string" ? nextValue : "",
      };
    case "debt_member_changed":
      return { phrase: "changed the member", detail: "" };
    case "debt_direction_changed":
      return { phrase: "changed who owes whom", detail: "" };
    case "debt_date_changed":
      return {
        phrase: "changed the debt date",
        detail: typeof nextValue === "string" ? formatDate(nextValue) : "",
      };
    case "debt_event_added":
      return { phrase: "added the debt to an event", detail: "" };
    case "debt_event_removed":
      return { phrase: "removed the debt from its event", detail: "" };
    case "debt_archived":
      return { phrase: "archived the debt", detail: "" };
    case "debt_settled":
      return { phrase: "settled the debt", detail: "" };
    case "debt_reopened":
      return { phrase: "reopened the debt", detail: "" };
    case "debt_verification_requested":
      return { phrase: "requested verification", detail: "" };
    case "debt_verified":
      return { phrase: "verified the debt", detail: "" };
    case "debt_rejected":
      return { phrase: "rejected the debt", detail: "" };
    case "debt_marked_disputed":
      return { phrase: "marked the debt as disputed", detail: "" };
    case "debt_resolved":
      return { phrase: "resolved the dispute", detail: "" };
    case "debt_verification_cancelled":
      return { phrase: "cancelled verification", detail: "" };
    case "verification_reset_financial_edit":
      return {
        phrase: "changed financial details",
        detail: "Verification is required again",
      };
    case "debt_edited":
      return { phrase: "updated debt details", detail: "" };
    default:
      return {
        phrase: action.replace(/^debt_/, "").replaceAll("_", " "),
        detail: "",
      };
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
  participantChipPressed: {
    opacity: 0.65,
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
