import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { DebtRow, EventRow } from "@/src/components/EntityRows";
import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
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
    SectionTitle,
    TextField,
} from "@/src/components/ui/Primitives";
import {
    palette,
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
    explainEventSettlement,
} from "@/src/services/ledger";
import { createRemoteLinkRequest } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { LedgerEntry, MoneyMap } from "@/src/types/models";
import { addMoney } from "@/src/utils/money";

export function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const member = data.members.find((item) => item.id === id);
  const [linkTarget, setLinkTarget] = useState(
    member?.email ?? member?.phone ?? "",
  );
  const [linkMessage, setLinkMessage] = useState("");

  const memberEntries = useMemo(
    () => (member ? entriesForMember(member.id, data.ledgerEntries) : []),
    [data.ledgerEntries, member],
  );
  const memberEvents = useMemo(
    () =>
      member
        ? data.eventMembers
            .filter((eventMember) => eventMember.memberId === member.id)
            .map((eventMember) =>
              data.events.find((event) => event.id === eventMember.eventId),
            )
            .filter(Boolean)
        : [],
    [data.eventMembers, data.events, member],
  );
  const trustBalances = useMemo(
    () => calculateTrustBalances(member?.id ?? "", memberEntries),
    [member?.id, memberEntries],
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

  async function exportPdf() {
    const memberPayments = data.payments.filter(
      (payment) =>
        payment.relatedMemberId === currentMember.id ||
        payment.payerMemberId === currentMember.id ||
        payment.payeeMemberId === currentMember.id,
    );
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
        title="Member details"
        action={
          <IconButton
            icon="create-outline"
            label="Edit member"
            onPress={() =>
              router.push({
                pathname: "/member/form",
                params: { id: member.id },
              })
            }
          />
        }
      />

      <Card tone="peach" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Relationship ledger</Text>
            <Text style={styles.heroTitle}>Net balance with this member</Text>
            <BalanceStack
              balances={data.memberBalances[member.id] ?? {}}
              settings={data.settings}
              currencyRates={data.currencyRates}
              empty="Settled with this member"
            />
            <View style={styles.badgeLine}>
              <LinkStatusBadge status={member.linkStatus} />
            </View>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
        <TagChips tags={member.tags} />
        {member.email || member.phone ? (
          <View style={styles.metaBlock}>
            {member.email ? (
              <Text style={styles.metaText}>{member.email}</Text>
            ) : null}
            {member.phone ? (
              <Text style={styles.metaText}>{member.phone}</Text>
            ) : null}
          </View>
        ) : null}
        {member.notes ? <Text style={styles.body}>{member.notes}</Text> : null}
        <View style={styles.actionRow}>
          <Button
            title="Add debt"
            icon="add"
            onPress={() =>
              router.push({
                pathname: "/debt/form",
                params: { memberId: member.id },
              })
            }
          />
          <Button
            title="Record settlement"
            icon="card"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/payment/form",
                params: { memberId: member.id },
              })
            }
          />
          <Button
            title="Send reminder"
            icon="notifications"
            variant="secondary"
            onPress={() =>
              data.createSoftReminder({
                senderUserId: auth.identity.authenticatedUserId,
                recipientUserId: member.linkedUserId,
                relatedMemberId: member.id,
                relatedEventId: null,
                relatedRecordId: null,
                message: `${auth.identity.displayName} shared a reminder about an open balance.`,
              })
            }
          />
          <Button
            title={member.archived ? "Restore" : "Archive"}
            icon={member.archived ? "archive-outline" : "archive"}
            variant="secondary"
            onPress={toggleMemberArchive}
          />
          <Button
            title="Export PDF"
            icon="document-text"
            variant="secondary"
            onPress={exportPdf}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Link member"
          subtitle="Linking enables verification but does not share historical debts automatically."
        />
        {member.linkStatus === "linked" ? (
          <>
            <Text style={styles.body}>
              Linked to{" "}
              {member.linkedProfileDisplayName ??
                member.linkedProfileEmail ??
                member.linkedUserId}
              . You can still call this member {member.displayName} in your
              local ledger.
            </Text>
            <Button
              title="Unlink member"
              icon="link-outline"
              variant="secondary"
              onPress={() =>
                data.unlinkMember(member.id, auth.identity.authenticatedUserId)
              }
            />
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Enter an email or phone to send a link request. Accepting a link
              request does not expose old private debts.
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
                member.linkStatus === "invite_pending"
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
                  targetEmail: cleanTarget.includes("@") ? cleanTarget : null,
                  targetPhone: cleanTarget.includes("@") ? null : cleanTarget,
                  requesterMemberId: member.id,
                  requesterLabel: member.displayName,
                  message: linkMessage,
                });
                await data.sendMemberLinkRequest(member.id, {
                  requesterUserId: auth.identity.authenticatedUserId,
                  targetEmail: cleanTarget.includes("@") ? cleanTarget : null,
                  targetPhone: cleanTarget.includes("@") ? null : cleanTarget,
                  message: linkMessage,
                  remoteId,
                });
              }}
              disabled={!linkTarget.trim()}
            />
          </>
        )}
      </Card>

      <Card tone={member.linkStatus === "linked" ? "blue" : "default"}>
        <SectionTitle
          title="Trust levels"
          subtitle={
            member.linkStatus === "linked"
              ? "Shared verified balances stay separate from private totals."
              : "Unlinked members show local/private balance only."
          }
        />
        {member.linkStatus === "linked" ? (
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
              balances={data.memberBalances[member.id] ?? {}}
              data={data}
            />
            <Text style={styles.body}>
              Link member to request verification.
            </Text>
          </>
        )}
      </Card>

      <SectionTitle
        title="Debt history"
        subtitle="Includes direct debts and event split obligations involving this member."
      />
      <Card>
        {memberEntries.length > 0 ? (
          memberEntries.map((entry) => (
            <DebtRow
              key={entry.id}
              entry={entry}
              members={data.members}
              event={
                entry.eventId
                  ? data.events.find((event) => event.id === entry.eventId)
                  : undefined
              }
            />
          ))
        ) : (
          <EmptyState
            title="No debt history"
            body="Add a simple debt or include this member in an event expense."
          />
        )}
      </Card>

      <SectionTitle
        title="Payment history"
        subtitle="Recorded payments and settlement records with this member."
      />
      <Card>
        {data.payments.filter(
          (payment) =>
            payment.relatedMemberId === member.id ||
            payment.payerMemberId === member.id ||
            payment.payeeMemberId === member.id,
        ).length > 0 ? (
          data.payments
            .filter(
              (payment) =>
                payment.relatedMemberId === member.id ||
                payment.payerMemberId === member.id ||
                payment.payeeMemberId === member.id,
            )
            .map((payment) => (
              <View key={payment.id} style={styles.trustRow}>
                <Text style={styles.trustLabel}>{payment.paymentDate}</Text>
                <Text style={styles.body}>
                  {payment.amount} {payment.currency} ·{" "}
                  {payment.status.replaceAll("_", " ")}
                </Text>
              </View>
            ))
        ) : (
          <EmptyState
            title="No payment history"
            body="Record a payment or settlement to reduce open balances."
          />
        )}
      </Card>

      <SectionTitle
        title="Events"
        subtitle="Structured groups this member belongs to."
      />
      <Card>
        {memberEvents.length > 0 ? (
          memberEvents.map((event) => {
            if (!event) {
              return null;
            }
            const explanation = explainEventSettlement(
              event.id,
              data.ledgerEntries,
            );
            return (
              <View key={event.id}>
                <EventRow
                  event={event}
                  memberCount={
                    data.eventMembers.filter(
                      (eventMember) => eventMember.eventId === event.id,
                    ).length
                  }
                  balance={explanation.participantNets[member.id] ?? {}}
                  settings={data.settings}
                  currencyRates={data.currencyRates}
                  unsettled={explanation.suggestions.length > 0}
                />
              </View>
            );
          })
        ) : (
          <EmptyState
            title="No events yet"
            body="Add this member to a group or event to split expenses."
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -26,
    right: -12,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.displayMedium,
  },
  heroArtWrap: {
    width: 142,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaBlock: {
    gap: spacing.xs,
  },
  metaText: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  body: {
    color: palette.ink,
    fontSize: typography.size.lg,
    lineHeight: typography.line.h3,
    fontFamily: typefaces.body,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  trustLabel: {
    color: palette.ink,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
});

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
