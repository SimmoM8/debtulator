import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AttachmentsSection } from "@/src/components/AttachmentsSection";
import { CommentsSection } from "@/src/components/CommentsSection";
import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Badge,
    StatusBadge,
    TagChips,
    VerificationBadge,
} from "@/src/components/ui/Badges";
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
    SelectChips,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import {
    activeAttachmentsForTarget,
    attachmentBadges,
} from "@/src/services/attachments";
import {
    debtPdfLines,
    shareExport,
    writePdfExport,
} from "@/src/services/export";
import { participantName } from "@/src/services/ledger";
import { explainSplit } from "@/src/services/splits";
import { useAppData } from "@/src/state/AppDataProvider";
import type { DebtStatus, VerificationStatus } from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

export function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  const event = expense
    ? data.events.find((item) => item.id === expense.eventId)
    : undefined;
  const attachments = expense
    ? activeAttachmentsForTarget(data.attachments, "shared_expense", expense.id)
    : [];
  const attachmentState = attachmentBadges(attachments);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!expense || !event) {
    return (
      <Screen>
        <EmptyState
          title="Expense not found"
          body="This shared expense may have been archived or removed."
        />
      </Screen>
    );
  }

  const currentExpense = expense;
  const splitExplanation = explainSplit({
    amount: expense.amount,
    currency: expense.currency,
    participantIds: expense.participantIds,
    splitMethod: expense.splitMethod,
    splitAllocations: expense.splitAllocations,
    expensePayers: expense.expensePayers,
  });

  async function updateStatus(status: DebtStatus) {
    await data.updateSharedExpense(currentExpense.id, { status });
  }

  async function updateVerification(verificationStatus: VerificationStatus) {
    await data.updateSharedExpense(currentExpense.id, { verificationStatus });
  }

  async function exportPdf() {
    const entries = data.ledgerEntries.filter(
      (entry) => entry.expenseId === currentExpense.id,
    );
    const uri = await writePdfExport(
      `debtulator-${currentExpense.title}.pdf`,
      debtPdfLines({
        title: currentExpense.title,
        entries,
        payments: data.payments.filter(
          (payment) => payment.eventId === currentExpense.eventId,
        ),
        settlements: data.settlements.filter(
          (settlement) => settlement.eventId === currentExpense.eventId,
        ),
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
      exportType: "pdf",
      targetType: "shared_expense",
      targetId: currentExpense.id,
      metadata: { uri },
    });
    await shareExport(uri, `${currentExpense.title} PDF`);
  }

  return (
    <Screen>
      <PageHeader
        title="Expense details"
        action={
          <IconButton
            icon="create-outline"
            label="Edit expense"
            onPress={() =>
              router.push({
                pathname: "/expense/form",
                params: { id: expense.id },
              })
            }
          />
        }
      />

      <Card
        tone={
          expense.verificationStatus === "rejected" ||
          expense.verificationStatus === "disputed"
            ? "coral"
            : "peach"
        }
        style={styles.heroCard}
      >
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Shared expense</Text>
            <View style={styles.amountRow}>
              <View>
                <Text style={styles.label}>Paid amount</Text>
                <Amount
                  amount={expense.amount}
                  currency={expense.currency}
                  size="lg"
                />
              </View>
              <View style={styles.badgeStack}>
                <StatusBadge status={expense.status} />
                <VerificationBadge status={expense.verificationStatus} />
                {attachmentState.receiptLabel ? (
                  <Badge label={attachmentState.receiptLabel} tone="positive" />
                ) : null}
              </View>
            </View>
            <Text style={styles.body}>
              Split by {expense.splitMethod.replaceAll("_", " ")} between{" "}
              {expense.participantIds
                .map((participantId) =>
                  participantName(
                    participantId,
                    data.members,
                    data.sharedEventMembers,
                  ),
                )
                .join(", ")}
              .
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
        {expense.notes ? (
          <Text style={styles.body}>{expense.notes}</Text>
        ) : null}
        <TagChips tags={expense.tags} />
        <View style={styles.actionRow}>
          <Button
            title="Export PDF"
            icon="document-text"
            variant="secondary"
            onPress={exportPdf}
          />
        </View>
      </Card>

      <AttachmentsSection
        targetType="shared_expense"
        targetId={expense.id}
        eventId={expense.eventId}
        parentVisibility={expense.visibility}
        preferredKind="receipt"
      />

      <CommentsSection
        targetType="shared_expense"
        targetId={expense.id}
        eventId={expense.eventId}
        sharedAvailable={expense.visibility === "shared_event"}
      />

      {expense.verificationStatus === "rejected" ||
      expense.verificationStatus === "disputed" ? (
        <Card tone="coral">
          <SectionTitle
            title={
              expense.verificationStatus === "rejected"
                ? "Rejected expense"
                : "Disputed expense"
            }
            subtitle="Excluded from shared settlement by default."
          />
          <Text style={styles.body}>
            This expense remains in your private local ledger. Rejected and
            disputed records are omitted from default event settlement
            suggestions until they are resolved or kept privately.
          </Text>
          <View style={styles.actionRow}>
            <Button
              title="Keep privately"
              icon="lock-closed"
              variant="secondary"
              onPress={() => updateVerification("local_only")}
            />
            <Button
              title="Mark resolved"
              icon="checkmark-circle"
              variant="secondary"
              onPress={() => updateVerification("resolved")}
            />
            <Button
              title="Archive"
              icon="archive"
              variant="danger"
              onPress={() => updateStatus("archived")}
            />
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionTitle
          title="Split explanation"
          subtitle="Shares, payer contributions, and resulting obligations."
        />
        <Text style={styles.label}>Paid by</Text>
        {expense.expensePayers.map((payer) => (
          <View key={payer.id} style={styles.infoRow}>
            <Text style={styles.infoValue}>
              {participantName(
                payer.eventMemberId,
                data.members,
                data.sharedEventMembers,
              )}
            </Text>
            <Text style={styles.money}>
              {formatMoney(payer.amountPaid, payer.currency)}
            </Text>
          </View>
        ))}
        <Text style={styles.label}>Participant shares</Text>
        {Object.entries(splitExplanation.participantShares).map(
          ([participantId, share]) => (
            <View key={participantId} style={styles.infoRow}>
              <Text style={styles.infoValue}>
                {participantName(
                  participantId,
                  data.members,
                  data.sharedEventMembers,
                )}
              </Text>
              <Text style={styles.money}>
                {formatMoney(share, expense.currency)}
              </Text>
            </View>
          ),
        )}
        <Text style={styles.label}>Generated obligations</Text>
        {expense.generatedObligations.map((obligation) => (
          <View key={obligation.id} style={styles.infoRow}>
            <Text style={styles.infoValue}>
              {participantName(
                obligation.fromParticipantId,
                data.members,
                data.sharedEventMembers,
              )}{" "}
              pays{" "}
              {participantName(
                obligation.toParticipantId,
                data.members,
                data.sharedEventMembers,
              )}
            </Text>
            <Text style={styles.money}>
              {formatMoney(obligation.amount, obligation.currency)}
            </Text>
          </View>
        ))}
        <Text style={styles.body}>
          Rounding adjustment:{" "}
          {formatMoney(splitExplanation.roundingAdjustment, expense.currency)}.
          Payer contribution total:{" "}
          {formatMoney(
            splitExplanation.payerContributionTotal,
            expense.currency,
          )}
          .
        </Text>
      </Card>

      <Card>
        <SectionTitle
          title="Local status controls"
          subtitle="Financial edits to verified expenses reset local verification to pending."
        />
        <SelectChips
          label="Expense status"
          value={expense.status}
          options={[
            { label: "Active", value: "active" },
            { label: "Settled", value: "settled" },
            { label: "Archived", value: "archived" },
          ]}
          onChange={updateStatus}
        />
        <SelectChips
          label="Verification"
          value={expense.verificationStatus}
          options={[
            { label: "Local only", value: "local_only" },
            { label: "Pending", value: "pending" },
            { label: "Partially verified", value: "partially_verified" },
            { label: "Verified", value: "verified" },
            { label: "Rejected", value: "rejected" },
            { label: "Disputed", value: "disputed" },
            { label: "Resolved", value: "resolved" },
          ]}
          onChange={updateVerification}
        />
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
    top: -24,
    right: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
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
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  label: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoValue: {
    flex: 1,
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  money: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
});
