import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { DebtRow, GroupRow } from "@/src/components/EntityRows";
import { LinkStatusBadge, TagChips } from "@/src/components/ui/Badges";
import { BalanceStack } from "@/src/components/ui/Money";
import {
    Button,
    Card,
    EmptyState,
    IconButton,
    LoadingState,
    PageHeader,
    Screen,
    SlidingSectionSwitcher,
    TextField,
} from "@/src/components/ui/Primitives";
import {
    palette,
    radii,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";
import {
    memberPdfLines,
    shareExport,
    writePdfExport,
} from "@/src/services/export";
import {
    entriesForMember,
    explainGroupSettlement,
} from "@/src/services/ledger";
import { createRemoteLinkRequest } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { LedgerEntry, MoneyMap } from "@/src/types/models";
import { addMoney, formatMoney } from "@/src/utils/money";
import { initials } from "@/src/utils/text";

type MemberDetailSectionKey = "overview" | "debts" | "payments" | "groups";
type IconName = keyof typeof Ionicons.glyphMap;

export function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const member = data.members.find((item) => item.id === id);
  const [linkTarget, setLinkTarget] = useState(
    member?.email ?? member?.phone ?? "",
  );
  const [linkMessage, setLinkMessage] = useState("");
  const [activeSection, setActiveSection] =
    useState<MemberDetailSectionKey>("overview");

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
  const trustBalances = useMemo(
    () => calculateTrustBalances(member?.id ?? "", memberEntries),
    [member?.id, memberEntries],
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
  const memberSections: { key: MemberDetailSectionKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "debts", label: "Debts" },
    { key: "payments", label: "Payments" },
    { key: "groups", label: "Groups" },
  ];

  async function exportPdf() {
    const memberSettlements = data.settlements.filter(
      (settlement) => settlement.memberId === currentMember.id,
    );
    const uri = await writePdfExport(
      `debtulator-${currentMember.displayName}.pdf`,
      memberPdfLines({
        member: currentMember,
        entries: memberEntries,
        payments: memberPayments,
        settlements: memberSettlements,
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
      targetType: "member",
      targetId: currentMember.id,
      metadata: { uri },
    });
    await shareExport(uri, `${currentMember.displayName} PDF`);
  }

  function toggleMemberArchive() {
    if (currentMember.archived) {
      void data.updateMember(currentMember.id, { archived: false });
      return;
    }

    Alert.alert(
      "Archive member?",
      "This hides the member from active member lists while keeping existing ledger history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void data.updateMember(currentMember.id, { archived: true });
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <PageHeader
        detailLabel="Member"
        title={currentMember.displayName}
        action={
          <IconButton
            icon="create-outline"
            label="Edit member"
            onPress={() =>
              router.push({
                pathname: "/member/form",
                params: { id: currentMember.id },
              })
            }
          />
        }
      />

      <Card tone="peach" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroHeading}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {initials(currentMember.displayName)}
            </Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Relationship ledger</Text>
            <Text numberOfLines={2} style={styles.heroTitle}>
              {currentMember.displayName}
            </Text>
            <Text style={styles.heroSubtitle}>Net balance with this member</Text>
            <BalanceStack
              balances={memberBalance}
              settings={data.settings}
              currencyRates={data.currencyRates}
              empty="Settled with this member"
            />
            <View style={styles.badgeLine}>
              <LinkStatusBadge status={currentMember.linkStatus} />
              {currentMember.archived ? (
                <View style={styles.archivedBadge}>
                  <Text style={styles.archivedBadgeText}>archived</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <HeroAction
            title="Add debt"
            icon="add"
            onPress={() =>
              router.push({
                pathname: "/debt/form",
                params: { memberId: currentMember.id },
              })
            }
          />
          <HeroAction
            title="Settlement"
            icon="card"
            onPress={() =>
              router.push({
                pathname: "/payment/form",
                params: { memberId: currentMember.id },
              })
            }
          />
          <HeroAction
            title="Reminder"
            icon="notifications"
            onPress={() =>
              data.createSoftReminder({
                senderUserId: auth.identity.authenticatedUserId,
                recipientUserId: currentMember.linkedUserId,
                relatedMemberId: currentMember.id,
                relatedGroupId: null,
                relatedRecordId: null,
                message: `${auth.identity.displayName} shared a reminder about an open balance.`,
              })
            }
          />
          <HeroAction
            title={currentMember.archived ? "Restore" : "Archive"}
            icon={currentMember.archived ? "archive-outline" : "archive"}
            onPress={toggleMemberArchive}
          />
          <HeroAction
            title="Export"
            icon="document-text"
            onPress={exportPdf}
          />
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
            <CardHeading
              title="Details"
              subtitle="Local profile details for this relationship."
            />
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
                currentMember.tags.length ? (
                  <TagChips tags={currentMember.tags} />
                ) : (
                  "No tags"
                )
              }
            />
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesBody}>
                {currentMember.notes || "No notes added"}
              </Text>
            </View>
          </Card>

          <Card style={styles.detailsCard}>
            <CardHeading
              title="Link member"
              subtitle="Linking enables verification but does not share historical debts automatically."
            />
            {currentMember.linkStatus === "linked" ? (
              <>
                <View style={styles.connectedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={palette.positive}
                  />
                  <Text style={styles.body}>
                    Linked to{" "}
                    {currentMember.linkedProfileDisplayName ??
                      currentMember.linkedProfileEmail ??
                      currentMember.linkedUserId}
                    .
                  </Text>
                </View>
                <Button
                  title="Unlink member"
                  icon="link-outline"
                  variant="secondary"
                  onPress={() =>
                    data.unlinkMember(
                      currentMember.id,
                      auth.identity.authenticatedUserId,
                    )
                  }
                />
              </>
            ) : (
              <>
                <Text style={styles.body}>
                  Enter an email or phone to send a link request. Accepting a
                  link request does not expose old private debts.
                </Text>
                <TextField
                  label="Email or phone"
                  value={linkTarget}
                  onChangeText={setLinkTarget}
                  placeholder="name@example.com"
                  keyboardType={
                    linkTarget.includes("@") ? "email-address" : "default"
                  }
                />
                <TextField
                  label="Message"
                  value={linkMessage}
                  onChangeText={setLinkMessage}
                  placeholder="Optional"
                  multiline
                />
                <Button
                  title={
                    currentMember.linkStatus === "invite_pending"
                      ? "Resend link request"
                      : "Link member"
                  }
                  icon="link"
                  onPress={async () => {
                    if (!auth.identity.authenticatedUserId) {
                      Alert.alert(
                        "Account required",
                        "Sign in before linking a member to a real user.",
                      );
                      return;
                    }
                    const cleanTarget = linkTarget.trim();
                    const remoteId = await createRemoteLinkRequest({
                      requesterUserId: auth.identity.authenticatedUserId,
                      targetEmail: cleanTarget.includes("@")
                        ? cleanTarget
                        : null,
                      targetPhone: cleanTarget.includes("@")
                        ? null
                        : cleanTarget,
                      requesterMemberId: currentMember.id,
                      requesterLabel: currentMember.displayName,
                      message: linkMessage,
                    });
                    await data.sendMemberLinkRequest(currentMember.id, {
                      requesterUserId: auth.identity.authenticatedUserId,
                      targetEmail: cleanTarget.includes("@")
                        ? cleanTarget
                        : null,
                      targetPhone: cleanTarget.includes("@")
                        ? null
                        : cleanTarget,
                      message: linkMessage,
                      remoteId,
                    });
                  }}
                  disabled={!linkTarget.trim()}
                />
              </>
            )}
          </Card>

          <Card
            tone={currentMember.linkStatus === "linked" ? "blue" : "default"}
            style={styles.detailsCard}
          >
            <CardHeading
              title="Trust levels"
              subtitle={
                currentMember.linkStatus === "linked"
                  ? "Shared verified balances stay separate from private totals."
                  : "Unlinked members show local/private balance only."
              }
            />
            {currentMember.linkStatus === "linked" ? (
              <>
                <TrustBalance
                  label="Verified"
                  balances={trustBalances.verified}
                  data={data}
                />
                <TrustBalance
                  label="Pending"
                  balances={trustBalances.pending}
                  data={data}
                />
                <TrustBalance
                  label="Rejected/Disputed"
                  balances={trustBalances.rejectedDisputed}
                  data={data}
                />
                <TrustBalance
                  label="Private total"
                  balances={trustBalances.privateTotal}
                  data={data}
                />
              </>
            ) : (
              <>
                <TrustBalance
                  label="Local/private"
                  balances={memberBalance}
                  data={data}
                />
                <Text style={styles.body}>
                  Link member to request verification.
                </Text>
              </>
            )}
          </Card>
        </>
      ) : null}

      {activeSection === "debts" ? (
        <Card style={styles.detailsCard}>
          <CardHeading
            title="Debt history"
            subtitle="Direct debts and group obligations involving this member."
          />
          {memberEntries.length > 0 ? (
            memberEntries.map((entry) => (
              <DebtRow
                key={entry.id}
                entry={entry}
                members={data.members}
                group={
                  entry.groupId
                    ? data.groups.find((group) => group.id === entry.groupId)
                    : undefined
                }
              />
            ))
          ) : (
            <EmptyState
              title="No debt history"
              body="Add a simple debt or include this member in a group expense."
            />
          )}
        </Card>
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
    overflow: "hidden",
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    padding: spacing.xxl,
    gap: spacing.xl,
    borderColor: palette.borderIndigoSoft,
  },
  heroGlow: {
    position: "absolute",
    top: -52,
    right: -34,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(253,186,155,0.2)",
  },
  heroHeading: {
    alignItems: "center",
    gap: spacing.lg,
  },
  heroCopy: {
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  heroLabel: {
    color: palette.brand,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.displaySm,
    lineHeight: typography.line.displaySm,
    fontFamily: typefaces.displayMedium,
    textAlign: "center",
  },
  heroSubtitle: {
    color: palette.faint,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
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
  body: {
    color: palette.ink,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
  archivedBadge: {
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  archivedBadgeText: {
    color: palette.muted,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyStrong,
  },
  heroAction: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    backgroundColor: "rgba(255,255,255,0.64)",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  heroActionPressed: {
    opacity: 0.72,
  },
  heroActionText: {
    color: palette.brand,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  detailValue: {
    flex: 1,
    alignItems: "flex-end",
  },
  detailValueText: {
    color: palette.ink,
    fontSize: typography.size.base,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.bodyStrong,
    textAlign: "right",
  },
  inlineValueStack: {
    alignItems: "flex-end",
    gap: 2,
  },
  notesBlock: {
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  notesLabel: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  notesBody: {
    color: palette.ink,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  connectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
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

function HeroAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.heroAction,
        pressed && styles.heroActionPressed,
      ]}
    >
      <Ionicons name={icon} size={15} color={palette.brand} />
      <Text style={styles.heroActionText}>{title}</Text>
    </Pressable>
  );
}

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

function calculateTrustBalances(memberId: string, entries: LedgerEntry[]) {
  const verified: MoneyMap = {};
  const pending: MoneyMap = {};
  const rejectedDisputed: MoneyMap = {};
  const privateTotal: MoneyMap = {};

  for (const entry of entries) {
    const signedAmount =
      entry.toId === "me" && entry.fromId === memberId
        ? entry.amount
        : -entry.amount;
    addMoney(privateTotal, entry.currency, signedAmount);
    if (entry.verificationStatus === "verified") {
      addMoney(verified, entry.currency, signedAmount);
    }
    if (entry.verificationStatus === "pending") {
      addMoney(pending, entry.currency, signedAmount);
    }
    if (
      entry.verificationStatus === "rejected" ||
      entry.verificationStatus === "disputed"
    ) {
      addMoney(rejectedDisputed, entry.currency, signedAmount);
    }
  }

  return { verified, pending, rejectedDisputed, privateTotal };
}

function TrustBalance({
  label,
  balances,
  data,
}: {
  label: string;
  balances: MoneyMap;
  data: ReturnType<typeof useAppData>;
}) {
  return (
    <View style={styles.trustRow}>
      <Text style={styles.trustLabel}>{label}</Text>
      <BalanceStack
        balances={balances}
        settings={data.settings}
        currencyRates={data.currencyRates}
        empty="None"
        align="right"
      />
    </View>
  );
}
