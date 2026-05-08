import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AttachmentsSection } from "@/src/components/AttachmentsSection";
import { CommentsSection } from "@/src/components/CommentsSection";
import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Badge,
    LinkStatusBadge,
    StatusBadge,
    SyncBadge,
    TagChips,
    VerificationBadge,
    VisibilityBadge,
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
import { palette, spacing, typefaces } from "@/src/constants/design";
import {
    activeAttachmentsForTarget,
    attachmentBadges,
} from "@/src/services/attachments";
import {
    debtPdfLines,
    shareExport,
    writePdfExport,
} from "@/src/services/export";
import { buildLedgerEntries, entryDirectionText } from "@/src/services/ledger";
import { createRemoteDebtVerification } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { DebtStatus, VerificationStatus } from "@/src/types/models";

export function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
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
  const paymentLines = data.settlementLines.filter(
    (line) =>
      line.sourceRecordType === "simple_debt" && line.sourceRecordId === id,
  );
  const payments = data.payments.filter((payment) =>
    paymentLines.some((line) => line.paymentId === payment.id),
  );
  const attachments = debt
    ? activeAttachmentsForTarget(data.attachments, "debt", debt.id)
    : [];
  const attachmentState = attachmentBadges(attachments);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!debt || !entry) {
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

  async function updateStatus(status: DebtStatus) {
    await data.updateDebt(currentDebt.id, { status });
  }

  async function updateVerification(verificationStatus: VerificationStatus) {
    await data.updateDebt(currentDebt.id, { verificationStatus });
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

  return (
    <Screen>
      <PageHeader
        eyebrow="Simple debt"
        title={debt.title}
        subtitle={entryDirectionText(entry, data.members)}
        action={
          <IconButton
            icon="create-outline"
            label="Edit debt"
            onPress={() =>
              router.push({ pathname: "/debt/form", params: { id: debt.id } })
            }
          />
        }
      />

      <Card
        tone={
          debt.verificationStatus === "rejected" ||
          debt.verificationStatus === "disputed"
            ? "coral"
            : "lavender"
        }
      >
        <View style={styles.heroBackdrop} />
        <View style={styles.amountRow}>
          <View style={styles.amountColumn}>
            <Text style={styles.label}>Amount</Text>
            <Amount
              amount={
                debt.direction === "they_owe_me" ? debt.amount : -debt.amount
              }
              currency={debt.currency}
              signed
              size="lg"
            />
            <Text style={styles.bodyMuted}>
              {debt.direction === "they_owe_me"
                ? `${member?.displayName ?? "This member"} owes you.`
                : `You owe ${member?.displayName ?? "this member"}.`}
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={116} height={90} compact />
          </View>
          <View style={styles.badgeStack}>
            <StatusBadge status={debt.status} />
            <VerificationBadge status={debt.verificationStatus} />
            <VisibilityBadge visibility={debt.visibility} />
            <SyncBadge status={debt.syncStatus} />
            <Badge
              label={currentEntry!.paymentStatus.replaceAll("_", " ")}
              tone={
                currentEntry!.paymentStatus === "overpaid"
                  ? "amber"
                  : currentEntry!.paymentStatus === "paid"
                    ? "positive"
                    : "blue"
              }
            />
            {attachmentState.receiptLabel ? (
              <Badge label={attachmentState.receiptLabel} tone="positive" />
            ) : null}
            {attachmentState.proofLabel ? (
              <Badge label={attachmentState.proofLabel} tone="blue" />
            ) : null}
          </View>
        </View>
        <View style={styles.paymentGrid}>
          <InfoTile
            label="Original"
            value={`${debt.amount} ${debt.currency}`}
          />
          <InfoTile
            label="Paid"
            value={`${currentEntry!.amountPaid} ${debt.currency}`}
          />
          <InfoTile
            label="Remaining"
            value={`${currentEntry!.remainingAmount} ${debt.currency}`}
          />
        </View>
        {currentEntry!.overpaidAmount > 0 ? (
          <Text style={styles.body}>
            Overpaid by {currentEntry!.overpaidAmount} {debt.currency}. This
            creates an explainable unallocated credit between the same people.
          </Text>
        ) : null}
        {debt.notes ? <Text style={styles.body}>{debt.notes}</Text> : null}
        <TagChips tags={debt.tags} />
        <View style={styles.actionRow}>
          <Button
            title="Record payment"
            icon="card"
            onPress={() =>
              router.push({
                pathname: "/payment/form",
                params: { debtId: debt.id },
              })
            }
          />
          <Button
            title="Export PDF"
            icon="document-text"
            variant="secondary"
            onPress={exportPdf}
          />
        </View>
      </Card>

      <AttachmentsSection
        targetType="debt"
        targetId={debt.id}
        eventId={debt.eventId}
        parentVisibility={debt.visibility}
        preferredKind="receipt"
      />

      <CommentsSection
        targetType="debt"
        targetId={debt.id}
        eventId={debt.eventId}
        sharedAvailable={debt.visibility !== "private"}
      />

      <Card>
        <SectionTitle
          title="Payment history"
          subtitle="Payments are real transfers; settlement lines show how they apply."
        />
        {payments.length > 0 ? (
          payments.map((payment) => (
            <InfoRow
              key={payment.id}
              label={`${payment.paymentDate} · ${payment.status.replaceAll("_", " ")}`}
              value={`${payment.amount} ${payment.currency}`}
            />
          ))
        ) : (
          <Text style={styles.body}>No payments recorded yet.</Text>
        )}
      </Card>

      <Card>
        <SectionTitle
          title="Verification"
          subtitle={
            member?.linkStatus === "linked"
              ? "Request verification without sharing unrelated historical debts."
              : "Link this member to request verification."
          }
        />
        <View style={styles.badgeLine}>
          {member ? <LinkStatusBadge status={member.linkStatus} /> : null}
          <VerificationBadge status={debt.verificationStatus} />
          <VisibilityBadge visibility={debt.visibility} />
        </View>
        <Text style={styles.body}>
          {debt.visibility === "private"
            ? "This debt is private in your local ledger."
            : "This debt is shared only with the involved linked member for verification."}
        </Text>
        <View style={styles.actionRow}>
          <Button
            title="Request verification"
            icon="shield-checkmark"
            onPress={requestVerification}
            disabled={
              debt.verificationStatus === "pending" ||
              member?.linkStatus !== "linked"
            }
          />
          {debt.verificationStatus === "pending" ? (
            <Button
              title="Cancel request"
              icon="close-circle"
              variant="secondary"
              onPress={() =>
                data.cancelDebtVerification(
                  debt.id,
                  auth.identity.authenticatedUserId,
                )
              }
            />
          ) : null}
        </View>
      </Card>

      {debt.verificationStatus === "rejected" ? (
        <Card tone="coral">
          <SectionTitle
            title="Rejected debt"
            subtitle="This remains in your personal ledger."
          />
          <InfoRow
            label="Rejected by"
            value={debt.rejectedByUserId ?? "Linked member"}
          />
          <InfoRow
            label="Rejected at"
            value={
              debt.rejectedAt
                ? new Date(debt.rejectedAt).toLocaleString()
                : "Unknown"
            }
          />
          <InfoRow
            label="Reason"
            value={debt.rejectionReason ?? "No reason provided"}
          />
          <Text style={styles.body}>
            Rejected and disputed debts are excluded from shared settlement
            suggestions by default. You can keep this privately, edit it, mark
            it disputed or resolved, or archive it.
          </Text>
          <View style={styles.actionRow}>
            <Button
              title="Keep privately"
              icon="lock-closed"
              variant="secondary"
              onPress={() => updateVerification("local_only")}
            />
            <Button
              title="Edit and resend"
              icon="create"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/debt/form", params: { id: debt.id } })
              }
            />
            <Button
              title="Mark disputed"
              icon="warning"
              variant="secondary"
              onPress={() =>
                data.markDebtDisputed(
                  debt.id,
                  auth.identity.authenticatedUserId,
                )
              }
            />
            <Button
              title="Mark resolved"
              icon="checkmark-circle"
              variant="secondary"
              onPress={() =>
                data.markDebtResolved(
                  debt.id,
                  auth.identity.authenticatedUserId,
                )
              }
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

      {debt.verificationStatus === "disputed" ? (
        <Card tone="amber">
          <SectionTitle
            title="Disputed debt"
            subtitle="The other party rejected it and you marked the rejection as disputed."
          />
          <InfoRow
            label="Rejection reason"
            value={debt.rejectionReason ?? "No reason provided"}
          />
          <InfoRow
            label="Private dispute note"
            value={debt.disputeReason ?? "None"}
          />
          <View style={styles.actionRow}>
            <Button
              title="Edit and resend"
              icon="create"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/debt/form", params: { id: debt.id } })
              }
            />
            <Button
              title="Mark resolved"
              icon="checkmark-circle"
              variant="secondary"
              onPress={() =>
                data.markDebtResolved(
                  debt.id,
                  auth.identity.authenticatedUserId,
                )
              }
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

      {debt.verificationStatus === "resolved" ? (
        <Card tone="blue">
          <SectionTitle
            title="Resolved"
            subtitle="Excluded from verified shared balances unless verified again later."
          />
          <InfoRow
            label="Resolution note"
            value={
              debt.resolutionNote ??
              "Resolved without verifying the original debt."
            }
          />
        </Card>
      ) : null}

      <Card>
        <SectionTitle
          title="Metadata"
          subtitle="Financial edits to verified debts reset local verification to pending."
        />
        <InfoRow label="Member" value={member?.displayName ?? "Unknown"} />
        <InfoRow label="Member link" value={member?.linkStatus ?? "unlinked"} />
        <InfoRow label="Event" value={event?.name ?? "Not attached"} />
        <InfoRow
          label="Visibility"
          value={debt.visibility.replaceAll("_", " ")}
        />
        <InfoRow label="Sync" value={debt.syncStatus.replaceAll("_", " ")} />
        <InfoRow label="Debt date" value={debt.debtDate} />
        <InfoRow label="Due date" value={debt.dueDate ?? "None"} />
        <InfoRow
          label="Created"
          value={new Date(debt.createdAt).toLocaleString()}
        />
        <InfoRow
          label="Updated"
          value={new Date(debt.updatedAt).toLocaleString()}
        />
        <InfoRow
          label="Balance impact"
          value={
            debt.direction === "they_owe_me"
              ? "Increases owed to you"
              : "Increases what you owe"
          }
        />
        {debt.verifiedAt ? (
          <InfoRow
            label="Verified at"
            value={new Date(debt.verifiedAt).toLocaleString()}
          />
        ) : null}
        {debt.verifiedByUserId ? (
          <InfoRow label="Verified by" value={debt.verifiedByUserId} />
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          title="Local status controls"
          subtitle="Stage 1 simulates future verification/dispute workflows locally."
        />
        <SelectChips
          label="Debt status"
          value={debt.status}
          options={[
            { label: "Active", value: "active" },
            { label: "Settled", value: "settled" },
            { label: "Archived", value: "archived" },
          ]}
          onChange={updateStatus}
        />
        <SelectChips
          label="Verification"
          value={debt.verificationStatus}
          options={[
            { label: "Local only", value: "local_only" },
            { label: "Pending", value: "pending" },
            { label: "Verified", value: "verified" },
            { label: "Rejected", value: "rejected" },
            { label: "Disputed", value: "disputed" },
            { label: "Resolved", value: "resolved" },
            { label: "Cancelled", value: "cancelled" },
          ]}
          onChange={updateVerification}
        />
      </Card>

      <Card>
        <SectionTitle
          title="Activity"
          subtitle="Linking and verification history for this debt."
        />
        {data.activityLogs.filter(
          (activity) =>
            activity.entityKind === "debt" && activity.entityId === debt.id,
        ).length > 0 ? (
          data.activityLogs
            .filter(
              (activity) =>
                activity.entityKind === "debt" && activity.entityId === debt.id,
            )
            .map((activity) => (
              <InfoRow
                key={activity.id}
                label={activity.action.replaceAll("_", " ")}
                value={new Date(activity.createdAt).toLocaleString()}
              />
            ))
        ) : (
          <Text style={styles.body}>No activity yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBackdrop: {
    position: "absolute",
    top: -24,
    right: -10,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(221,214,254,0.22)",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  amountColumn: {
    flex: 1,
    minWidth: 180,
    gap: spacing.xs,
  },
  heroArtWrap: {
    width: 124,
    height: 96,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.34)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  body: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typefaces.body,
  },
  bodyMuted: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  infoTile: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typefaces.bodyStrong,
  },
  infoValue: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typefaces.body,
    flex: 1,
    textAlign: "right",
  },
});
