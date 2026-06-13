import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AvatarStack } from "@/src/components/ui/Finance";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import { Amount } from "@/src/components/ui/Money";
import { TagInput } from "@/src/components/ui/TagInput";
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
  const debt = data.debts.find((item) => item.id === id);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settlingUp, setSettlingUp] = useState(false);
  const [visibleActivityCount, setVisibleActivityCount] = useState(5);
  const [notesDraft, setNotesDraft] = useState<{
    debtId: string;
    value: string;
  } | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [tagsDraft, setTagsDraft] = useState<{
    debtId: string;
    value: string[];
  } | null>(null);
  const [savingTags, setSavingTags] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const member = debt
    ? data.members.find((item) => item.id === debt.memberId)
    : undefined;
  const group = debt?.groupId
    ? data.groups.find((item) => item.id === debt.groupId)
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

  const groupParticipants = currentDebt.groupId
    ? data.sharedGroupMembers
        .filter(
          (item) =>
            item.groupId === currentDebt.groupId && item.status === "active",
        )
        .map((item) => item.alias ?? item.displayName)
    : [];

  const participantLabels = Array.from(
    new Set([
      "You",
      member?.displayName ?? "Unknown member",
      ...groupParticipants,
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

    const sharedActor = data.sharedGroupMembers.find(
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
        title: `${activityActorName(payment.createdByUserId)} made a payment`,
        detail: `${formatMoney(appliedAmount, currentDebt.currency)} applied${
          payment.status === "recorded"
            ? ""
            : ` · ${payment.status.replaceAll("_", " ")}`
        }`,
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
  const visibleActivityItems = activityItems.slice(0, visibleActivityCount);
  const remainingActivityCount = Math.max(
    activityItems.length - visibleActivityItems.length,
    0,
  );

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
    : null;
  const isOverdue =
    !isFullyPaid &&
    Boolean(dueRelativeLabel?.includes("overdue"));
  const notesValue =
    notesDraft?.debtId === currentDebt.id
      ? notesDraft.value
      : currentDebt.notes ?? "";
  const notesChanged =
    notesValue.trim() !== (currentDebt.notes ?? "").trim();
  const tagsValue =
    tagsDraft?.debtId === currentDebt.id
      ? tagsDraft.value
      : currentDebt.tags;
  const tagsChanged =
    JSON.stringify(tagsValue) !== JSON.stringify(currentDebt.tags);
  const usedTagNames = Array.from(
    new Set([...data.tags.map((tag) => tag.name), ...currentDebt.tags]),
  );

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

  async function saveNotes() {
    if (!notesChanged || savingNotes) {
      return;
    }

    setSavingNotes(true);
    try {
      await data.updateDebt(
        currentDebt.id,
        { notes: notesValue },
        auth.identity.authenticatedUserId,
      );
      setNotesDraft(null);
    } catch {
      Alert.alert(
        "Could not save notes",
        "Your notes could not be saved. Please try again.",
      );
    } finally {
      setSavingNotes(false);
    }
  }

  async function saveTags() {
    if (!tagsChanged || savingTags) {
      return;
    }

    setSavingTags(true);
    try {
      await data.updateDebt(
        currentDebt.id,
        { tags: tagsValue },
        auth.identity.authenticatedUserId,
      );
      setTagsDraft(null);
      setTagsOpen(false);
    } catch {
      Alert.alert(
        "Could not save tags",
        "Your tags could not be saved. Please try again.",
      );
    } finally {
      setSavingTags(false);
    }
  }

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

      <Modal
        visible={tagsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setTagsDraft(null);
          setTagsOpen(false);
        }}
      >
        <View style={styles.tagsModalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close tags editor"
            style={styles.tagsModalBackdrop}
            onPress={() => {
              setTagsDraft(null);
              setTagsOpen(false);
            }}
          />
          <View style={styles.tagsModalPanel}>
            <Card style={styles.tagsModalCard}>
              <View style={styles.tagsModalHeader}>
                <View style={styles.tagsModalTitleCopy}>
                  <Text style={styles.tagsModalTitle}>Tags</Text>
                  <Text style={styles.tagsModalSubtitle}>
                    Add or remove tags for this debt.
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  label="Close tags editor"
                  onPress={() => {
                    setTagsDraft(null);
                    setTagsOpen(false);
                  }}
                />
              </View>
              <TagInput
                label="Tags"
                value={tagsValue}
                onChange={(value) =>
                  setTagsDraft({ debtId: currentDebt.id, value })
                }
                usedTags={usedTagNames}
              />
              <View style={styles.tagsModalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setTagsDraft(null);
                    setTagsOpen(false);
                  }}
                  style={styles.tagsModalButton}
                />
                <Button
                  title={savingTags ? "Saving..." : "Save"}
                  onPress={() => {
                    void saveTags();
                  }}
                  disabled={!tagsChanged || savingTags}
                  style={styles.tagsModalButton}
                />
              </View>
            </Card>
          </View>
        </View>
      </Modal>

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
              {formatMoney(currentEntry.originalAmount, currentDebt.currency)}
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

      </View>

      {/* ── Details ── */}
      <View style={styles.sectionHeader}>
        <SectionTitle title="Details" />
      </View>
      <Card tone="lavender" style={styles.detailsCard}>
        <DetailRow label="Member" value={member?.displayName ?? "Unknown"} />
        <DetailRow
          label="Date created"
          value={formatDate(currentDebt.debtDate)}
        />
        <DetailRow
          label="Due date"
          value={
            <View style={styles.dueValue}>
              <Text style={styles.dueValueDate}>
                {dueLabel}
              </Text>
              {dueRelativeLabel ? (
                <View style={styles.dueValueStatus}>
                  {isOverdue ? (
                    <Ionicons
                      name="alert-circle-outline"
                      size={13}
                      color={palette.negative}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.dueValueMeta,
                      isOverdue && styles.dueValueMetaOverdue,
                    ]}
                  >
                    {dueRelativeLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          }
        />
        {group ? <DetailRow label="Group" value={group.name} /> : null}
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
        <DetailRow
          label="Tags"
          value={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit debt tags"
              onPress={() => {
                setTagsDraft({
                  debtId: currentDebt.id,
                  value: currentDebt.tags,
                });
                setTagsOpen(true);
              }}
              style={({ pressed }) => [
                styles.tagsEditButton,
                pressed && styles.notesActionPressed,
              ]}
            >
              <Text style={styles.tagsEditButtonText}>
                {currentDebt.tags.length
                  ? `${currentDebt.tags.length} ${currentDebt.tags.length === 1 ? "tag" : "tags"}`
                  : "Add tags"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={palette.brand}
              />
            </Pressable>
          }
        />
        <View style={styles.notesBlock}>
          <Text style={styles.notesLabel}>Notes</Text>
          <View style={styles.notesInputShell}>
            <TextInput
              accessibilityLabel="Debt notes"
              value={notesValue}
              onChangeText={(value) =>
                setNotesDraft({ debtId: currentDebt.id, value })
              }
              placeholder="Add notes"
              placeholderTextColor={palette.faint}
              multiline
              textAlignVertical="top"
              style={styles.notesInput}
            />
            {notesChanged ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save debt notes"
                disabled={savingNotes}
                onPress={() => {
                  void saveNotes();
                }}
                style={({ pressed }) => [
                  styles.notesSaveAction,
                  savingNotes && styles.notesActionDisabled,
                  pressed && styles.notesActionPressed,
                ]}
              >
                {savingNotes ? (
                  <Text style={styles.notesSavingText}>...</Text>
                ) : (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color={palette.brand}
                  />
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </Card>

      {/* ── Activity ── */}
      {activityItems.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <SectionTitle title="Activity" />
          </View>
          <Card style={styles.activityCard}>
            {visibleActivityItems.map((activity, index) => (
              <ActivityTimelineRow
                key={activity.id}
                item={activity}
                isLast={index === visibleActivityItems.length - 1}
              />
            ))}
            {remainingActivityCount > 0 || visibleActivityCount > 5 ? (
              <View style={styles.activityActions}>
                {remainingActivityCount > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${Math.min(5, remainingActivityCount)} more activity items`}
                    onPress={() =>
                      setVisibleActivityCount((count) =>
                        Math.min(count + 5, activityItems.length),
                      )
                    }
                    style={({ pressed }) => [
                      styles.activityMoreButton,
                      pressed && styles.activityMoreButtonPressed,
                    ]}
                  >
                    <Text style={styles.activityMoreText}>
                      Show {Math.min(5, remainingActivityCount)} more
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={palette.brand}
                    />
                  </Pressable>
                ) : null}
                {visibleActivityCount > 5 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Show fewer activity items"
                    onPress={() => setVisibleActivityCount(5)}
                    style={({ pressed }) => [
                      styles.activityMoreButton,
                      pressed && styles.activityMoreButtonPressed,
                    ]}
                  >
                    <Text style={styles.activityMoreText}>Show less</Text>
                    <Ionicons
                      name="chevron-up"
                      size={16}
                      color={palette.brand}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
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
    case "debt_group_added":
      return { phrase: "added the debt to an group", detail: "" };
    case "debt_group_removed":
      return { phrase: "removed the debt from its group", detail: "" };
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
  dueValue: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  dueValueDate: {
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.body,
    textAlign: "right",
  },
  dueValueStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dueValueMeta: {
    color: palette.faint,
    fontSize: typography.size.xs,
    fontFamily: typefaces.body,
    textAlign: "right",
  },
  dueValueMetaOverdue: {
    color: palette.negative,
    fontFamily: typefaces.bodyStrong,
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
  tagsEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 4,
    paddingLeft: spacing.sm,
  },
  tagsEditButtonText: {
    color: palette.brand,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  tagsModalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screen,
  },
  tagsModalBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: palette.overlayStrong,
  },
  tagsModalPanel: {
    width: "100%",
    maxWidth: 480,
  },
  tagsModalCard: {
    width: "100%",
    padding: spacing.xxl,
    gap: spacing.xxl,
  },
  tagsModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  tagsModalTitleCopy: {
    flex: 1,
    gap: 2,
  },
  tagsModalTitle: {
    color: palette.ink,
    fontSize: typography.size.h3,
    fontFamily: typefaces.bodyHeavy,
  },
  tagsModalSubtitle: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  tagsModalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  tagsModalButton: {
    flex: 1,
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
  notesInputShell: {
    position: "relative",
    minHeight: 86,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  notesInput: {
    minHeight: 86,
    color: palette.ink,
    fontSize: typography.size.md,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  notesSaveAction: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: palette.lavenderMist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
  },
  notesActionPressed: {
    opacity: 0.68,
  },
  notesActionDisabled: {
    opacity: 0.35,
  },
  notesSavingText: {
    color: palette.brand,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
  },

  // Activity timeline
  activityCard: {
    gap: 0,
  },
  activityActions: {
    flexDirection: "row",
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  activityMoreButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  activityMoreButtonPressed: {
    opacity: 0.65,
  },
  activityMoreText: {
    color: palette.brand,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
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
    minWidth: 84,
    marginLeft: "auto",
    textAlign: "right",
    flexShrink: 0,
  },
});
