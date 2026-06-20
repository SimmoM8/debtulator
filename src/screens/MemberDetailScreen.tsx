import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { DebtLedgerSection, debtSectionTotalLabel } from "@/src/components/DebtLedgerSection";
import { GroupRow } from "@/src/components/EntityRows";
import { MobileMenuModal } from "@/src/components/ui/MenuList";
import { TagInput } from "@/src/components/ui/TagInput";
import {
    Button,
    Card,
    EmptyState,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SlidingSectionSwitcher,
} from "@/src/components/ui/Primitives";
import {
    palette,
    radii,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";
import { estimateMoneyMap } from "@/src/services/currency";
import {
    entriesForMember,
    explainGroupSettlement,
} from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { formatMoney } from "@/src/utils/money";
import { initials } from "@/src/utils/text";

type MemberDetailSectionKey = "overview" | "debts" | "payments" | "groups";

export function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const member = data.members.find((item) => item.id === id);
  const [activeSection, setActiveSection] =
    useState<MemberDetailSectionKey>("overview");
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [tagsDraft, setTagsDraft] = useState<string[] | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const memberEntries = useMemo(
    () => (member ? entriesForMember(member.id, data.ledgerEntries) : []),
    [data.ledgerEntries, member],
  );
  const memberGroups = useMemo(
    () =>
      member
        ? data.groupMembers
            .filter((groupMember) => groupMember.memberId === member.id)
            .map((groupMember) =>
              data.groups.find((group) => group.id === groupMember.groupId),
            )
            .filter(Boolean)
        : [],
    [data.groupMembers, data.groups, member],
  );
  const memberPayments = useMemo(
    () =>
      member
        ? data.payments.filter(
            (payment) =>
              payment.relatedMemberId === member.id ||
              payment.payerMemberId === member.id ||
              payment.payeeMemberId === member.id,
          )
        : [],
    [data.payments, member],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  if (!member) {
    return (
      <Screen>
        <EmptyState
          title="Member not found"
          body="This local member may have been archived or removed."
        />
      </Screen>
    );
  }
  const currentMember = member;
  const memberBalance = data.memberBalances[currentMember.id] ?? {};
  const netBalance = estimateMoneyMap(memberBalance, data.settings, data.currencyRates);
  const openMemberEntries = memberEntries.filter(
    (entry) =>
      entry.status !== "archived" &&
      entry.status !== "settled" &&
      entry.paymentStatus !== "paid" &&
      entry.remainingAmount > 0.005,
  );
  const memberYouOwe = openMemberEntries.filter((entry) => entry.fromId === "me");
  const memberOwesYou = openMemberEntries.filter((entry) => entry.toId === "me");
  const notesValue = notesDraft ?? currentMember.notes ?? "";
  const notesChanged = notesValue.trim() !== (currentMember.notes ?? "").trim();
  const tagsValue = tagsDraft ?? currentMember.tags;
  const tagsChanged = JSON.stringify(tagsValue) !== JSON.stringify(currentMember.tags);
  const usedTagNames = Array.from(
    new Set([...data.tags.map((tag) => tag.name), ...currentMember.tags]),
  );
  const memberSections: { key: MemberDetailSectionKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "debts", label: "Debts" },
    { key: "payments", label: "Payments" },
    { key: "groups", label: "Groups" },
  ];

  async function saveNotes() {
    if (!notesChanged || savingNotes) return;
    setSavingNotes(true);
    try {
      await data.updateMember(currentMember.id, { notes: notesValue });
      setNotesDraft(null);
    } catch {
      Alert.alert("Could not save notes", "Your notes could not be saved. Please try again.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function saveTags() {
    if (!tagsChanged || savingTags) return;
    setSavingTags(true);
    try {
      await data.updateMember(currentMember.id, { tags: tagsValue });
      setTagsDraft(null);
      setTagsOpen(false);
    } catch {
      Alert.alert("Could not save tags", "Your tags could not be saved. Please try again.");
    } finally {
      setSavingTags(false);
    }
  }

  function deleteMember() {
    setOptionsOpen(false);
    Alert.alert(
      "Delete member?",
      "This removes the member from your members list while preserving existing debt and payment history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await data.updateMember(currentMember.id, { archived: true });
            router.back();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Modal visible={tagsOpen} transparent animationType="fade" onRequestClose={() => setTagsOpen(false)}>
        <View style={styles.tagsModalOverlay}>
          <Pressable style={styles.tagsModalBackdrop} onPress={() => setTagsOpen(false)} />
          <Card style={styles.tagsModalCard}>
            <View style={styles.tagsModalHeader}>
              <View>
                <Text style={styles.tagsModalTitle}>Tags</Text>
                <Text style={styles.tagsModalSubtitle}>Add or remove tags for this member.</Text>
              </View>
              <IconButton icon="close" label="Close tags editor" onPress={() => setTagsOpen(false)} />
            </View>
            <TagInput value={tagsValue} onChange={setTagsDraft} usedTags={usedTagNames} />
            <View style={styles.tagsModalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setTagsOpen(false)} style={styles.tagsModalButton} />
              <Button title={savingTags ? "Saving..." : "Save"} disabled={!tagsChanged || savingTags} onPress={() => void saveTags()} style={styles.tagsModalButton} />
            </View>
          </Card>
        </View>
      </Modal>

      <PageHeader
        detailLabel="Member"
        title="Member"
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Member options"
            onPress={() => setOptionsOpen(true)}
          />
        }
      />

      <MobileMenuModal
        visible={optionsOpen}
        title="Member options"
        onClose={() => setOptionsOpen(false)}
        sections={[
          {
            items: [
              {
                label: "Edit member",
                subtitle: "Update name, contact details, tags, and notes",
                icon: "create-outline",
                onPress: () => {
                  setOptionsOpen(false);
                  router.push({
                    pathname: "/member/form",
                    params: { id: currentMember.id },
                  });
                },
              },
              {
                label: "Delete member",
                subtitle: "Remove this member from your members list",
                icon: "trash-outline",
                destructive: true,
                onPress: deleteMember,
              },
            ],
          },
        ]}
      />

      <Card tone={netBalance < -0.005 ? "coral" : "mint"} style={styles.heroCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{initials(currentMember.displayName)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.heroTitle}>{currentMember.displayName}</Text>
        <Text style={styles.heroAmount}>
          {formatMoney(Math.abs(netBalance), data.settings.baseCurrency)}
        </Text>
        <View style={[
          styles.directionPill,
          netBalance < -0.005 ? styles.directionPillNegative : styles.directionPillPositive,
        ]}>
          <Text style={[
            styles.directionPillText,
            netBalance < -0.005 ? styles.directionPillTextNegative : styles.directionPillTextPositive,
          ]}>
            {netBalance > 0.005 ? "They owe you" : netBalance < -0.005 ? "You owe" : "Settled"}
          </Text>
        </View>
      </Card>

      <SlidingSectionSwitcher
        sections={memberSections}
        activeSection={activeSection}
        onChange={setActiveSection}
      />

      {activeSection === "overview" ? (
        <>
          <Card tone="lavender" style={styles.detailsCard}>
            <DetailRow label="Open debts" value={String(openMemberEntries.length)} />
            <DetailRow
              label="Contact"
              value={
                currentMember.email || currentMember.phone ? (
                  <View style={styles.inlineValueStack}>
                    {currentMember.email ? (
                      <Text style={styles.detailValueText}>
                        {currentMember.email}
                      </Text>
                    ) : null}
                    {currentMember.phone ? (
                      <Text style={styles.detailValueText}>
                        {currentMember.phone}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  "No contact added"
                )
              }
            />
            <DetailRow
              label="Tags"
              value={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit member tags"
                  onPress={() => {
                    setTagsDraft(currentMember.tags);
                    setTagsOpen(true);
                  }}
                  style={({ pressed }) => [styles.tagsEditButton, pressed && styles.actionPressed]}
                >
                  <Text style={styles.tagsEditButtonText}>
                    {currentMember.tags.length
                      ? `${currentMember.tags.length} ${currentMember.tags.length === 1 ? "tag" : "tags"}`
                      : "Add tags"}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={palette.brand} />
                </Pressable>
              }
            />
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notes</Text>
              <View style={styles.notesInputShell}>
                <TextInput
                  accessibilityLabel="Member notes"
                  value={notesValue}
                  onChangeText={setNotesDraft}
                  placeholder="Add notes"
                  placeholderTextColor={palette.faint}
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                />
                {notesChanged ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save member notes"
                    disabled={savingNotes}
                    onPress={() => void saveNotes()}
                    style={({ pressed }) => [styles.notesSaveAction, pressed && styles.actionPressed]}
                  >
                    {savingNotes ? <Text style={styles.notesSavingText}>...</Text> : <Ionicons name="checkmark" size={15} color={palette.brand} />}
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {activeSection === "debts" ? (
        <>
          <DebtLedgerSection title="You owe" subtitle="Things you still need to pay." entries={memberYouOwe} summaryAmount={debtSectionTotalLabel(memberYouOwe, data.settings, data.currencyRates)} summaryTone="negative" members={data.members} sharedGroupMembers={data.sharedGroupMembers} />
          <DebtLedgerSection title="Owed to you" subtitle="Things this member still owes you." entries={memberOwesYou} summaryAmount={debtSectionTotalLabel(memberOwesYou, data.settings, data.currencyRates)} summaryTone="positive" members={data.members} sharedGroupMembers={data.sharedGroupMembers} />
          {!openMemberEntries.length ? (
            <Card tone="lavender">
            <EmptyState
              title="No open debts"
              body="There are no unsettled debts with this member."
            />
            </Card>
          ) : null}
        </>
      ) : null}

      {activeSection === "payments" ? (
        <Card style={styles.detailsCard}>
          <CardHeading
            title="Payment history"
            subtitle="Recorded payments and settlement records with this member."
          />
          {memberPayments.length > 0 ? (
            memberPayments.map((payment) => (
              <View key={payment.id} style={styles.trustRow}>
                <View style={styles.paymentDatePill}>
                  <Text style={styles.paymentDateText}>
                    {formatShortDate(payment.paymentDate)}
                  </Text>
                </View>
                <View style={styles.paymentCopy}>
                  <Text style={styles.trustLabel}>
                    {formatMoney(payment.amount, payment.currency)}
                  </Text>
                  <Text style={styles.paymentMeta}>
                    {payment.status.replaceAll("_", " ")}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyState
              title="No payment history"
              body="Record a payment or settlement to reduce open balances."
            />
          )}
        </Card>
      ) : null}

      {activeSection === "groups" ? (
        <Card style={styles.detailsCard}>
          <CardHeading
            title="Groups"
            subtitle="Structured groups this member belongs to."
          />
          {memberGroups.length > 0 ? (
            memberGroups.map((group) => {
              if (!group) {
                return null;
              }
              const explanation = explainGroupSettlement(
                group.id,
                data.ledgerEntries,
              );
              return (
                <View key={group.id}>
                  <GroupRow
                    group={group}
                    memberCount={
                      data.groupMembers.filter(
                        (groupMember) => groupMember.groupId === group.id,
                      ).length
                    }
                    balance={explanation.participantNets[currentMember.id] ?? {}}
                    settings={data.settings}
                    currencyRates={data.currencyRates}
                    unsettled={explanation.suggestions.length > 0}
                  />
                </View>
              );
            })
          ) : (
            <EmptyState
              title="No groups yet"
              body="Add this member to a group to split expenses."
            />
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    padding: spacing.xxl,
    gap: spacing.md,
    borderColor: palette.borderIndigoSoft,
    alignItems: "center",
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.displaySm,
    lineHeight: typography.line.displaySm,
    fontFamily: typefaces.displayMedium,
    textAlign: "center",
  },
  heroAmount: {
    color: palette.ink,
    fontSize: typography.size.h1,
    fontFamily: typefaces.display,
  },
  directionPill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  directionPillPositive: {
    backgroundColor: palette.positiveSoft,
  },
  directionPillNegative: {
    backgroundColor: palette.negativeSoft,
  },
  directionPillText: {
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
  },
  directionPillTextPositive: {
    color: palette.positive,
  },
  directionPillTextNegative: {
    color: palette.negative,
  },
  avatarLarge: {
    width: 74,
    height: 74,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceGlassStrong,
    borderWidth: 1.5,
    borderColor: palette.borderIndigo,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  avatarLargeText: {
    color: palette.brand,
    fontSize: typography.size.h2,
    fontFamily: typefaces.bodyHeavy,
  },
  detailsCard: {
    gap: 0,
    marginBottom: spacing.md,
  },
  cardHeading: {
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderIndigoSoft,
    gap: 2,
  },
  cardHeadingTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xl,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.displayMedium,
  },
  cardHeadingSubtitle: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
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
    flex: 1,
    alignItems: "flex-end",
  },
  detailValueText: {
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.body,
    textAlign: "right",
  },
  inlineValueStack: {
    alignItems: "flex-end",
    gap: 2,
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
    borderRadius: radii.pill,
    backgroundColor: palette.lavenderMist,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigo,
    alignItems: "center",
    justifyContent: "center",
  },
  notesSavingText: {
    color: palette.brand,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
  },
  actionPressed: { opacity: 0.7 },
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
  tagsModalCard: { width: "100%", maxWidth: 520, gap: spacing.lg },
  tagsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  tagsModalTitle: { color: palette.ink, fontSize: typography.size.xl, fontFamily: typefaces.displayMedium },
  tagsModalSubtitle: { color: palette.muted, fontSize: typography.size.sm, fontFamily: typefaces.body },
  tagsModalActions: { flexDirection: "row", gap: spacing.sm },
  tagsModalButton: { flex: 1 },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  trustLabel: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  paymentDatePill: {
    minWidth: 68,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceLavender,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: "center",
  },
  paymentDateText: {
    color: palette.brand,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
  },
  paymentCopy: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  paymentMeta: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
});

function CardHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.cardHeading}>
      <Text style={styles.cardHeadingTitle}>{title}</Text>
      {subtitle ? (
        <Text style={styles.cardHeadingSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValue}>
        {typeof value === "string" ? (
          <Text style={styles.detailValueText}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
