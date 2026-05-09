import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import { Badge, StatusBadge, VerificationBadge } from "@/src/components/ui/Badges";
import { AvatarStack } from "@/src/components/ui/Finance";
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
  shadows,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";
import {
  debtPdfLines,
  shareExport,
  writePdfExport,
} from "@/src/services/export";
import { buildLedgerEntries, entryDirectionText } from "@/src/services/ledger";
import { createRemoteDebtVerification } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { DebtStatus } from "@/src/types/models";

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
    new Set(["You", member?.displayName ?? "Unknown member", ...eventParticipants]),
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
          activity.entityKind === "debt" && activity.entityId === currentDebt.id,
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
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });

  async function updateStatus(status: DebtStatus) {
    await data.updateDebt(currentDebt.id, { status });
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

  function openOptions() {
    Alert.alert("Debt options", "Choose an action", [
      {
        text: "Edit debt",
        onPress: () =>
          router.push({ pathname: "/debt/form", params: { id: currentDebt.id } }),
      },
      {
        text: "Export PDF",
        onPress: () => {
          void exportPdf();
        },
      },
      ...(member?.linkStatus === "linked" &&
      currentDebt.verificationStatus !== "pending"
        ? [
            {
              text: "Request verification",
              onPress: () => {
                void requestVerification();
              },
            },
          ]
        : []),
      ...(currentDebt.status !== "archived"
        ? [
            {
              text: "Archive",
              style: "destructive" as const,
              onPress: () => {
                void updateStatus("archived");
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  const dueLabel = currentDebt.dueDate
    ? formatDate(currentDebt.dueDate)
    : "No due date";

  const signedAmount =
    currentDebt.direction === "they_owe_me" ? currentDebt.amount : -currentDebt.amount;

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
        title="Debt details"
        action={
          <IconButton
            icon="ellipsis-horizontal"
            label="Debt options"
            onPress={openOptions}
          />
        }
      />

      <View style={styles.overview}>
        <View style={styles.overviewTop}>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={112} height={88} compact />
          </View>
          <View style={styles.overviewCopy}>
            <Text style={styles.debtTitle}>{currentDebt.title}</Text>
            <Text style={styles.subtext}>{entryDirectionText(entry, data.members)}</Text>
          </View>
          <Badge
            label={
              currentDebt.direction === "they_owe_me" ? "owes you" : "you owe"
            }
            tone={currentDebt.direction === "they_owe_me" ? "positive" : "amber"}
          />
        </View>
        <View style={styles.amountBlock}>
          <Amount
            amount={signedAmount}
            currency={currentDebt.currency}
            signed
            size="lg"
          />
          <Text style={styles.dueLine}>Due {dueLabel}</Text>
        </View>
      </View>

      <Card tone="lavender" style={styles.summaryCard}>
        <SectionTitle
          title="Summary"
          subtitle="Status, participants, split context, and notes."
        />
        <View style={styles.badgeLine}>
          <StatusBadge status={currentDebt.status} />
          <VerificationBadge status={currentDebt.verificationStatus} />
          <Badge
            label={currentEntry.paymentStatus.replaceAll("_", " ")}
            tone={
              currentEntry.paymentStatus === "paid"
                ? "positive"
                : currentEntry.paymentStatus === "overpaid"
                  ? "amber"
                  : "blue"
            }
          />
        </View>
        <SummaryRow label="Created by" value="You" />
        <SummaryRow
          label="Participants"
          value={
            <View style={styles.participantsValue}>
              <AvatarStack labels={participantLabels} />
              <Text style={styles.valueMeta}>
                {participantLabels.length} participant
                {participantLabels.length === 1 ? "" : "s"}
              </Text>
            </View>
          }
        />
        <SummaryRow label="Split type" value={event ? "Event debt" : "Direct debt"} />
        <SummaryRow
          label={
            currentDebt.direction === "they_owe_me"
              ? "Amount owed to you"
              : "Amount you owe"
          }
          value={`${currentDebt.amount} ${currentDebt.currency}`}
        />
        <SummaryRow
          label="Total amount"
          value={`${currentDebt.amount} ${currentDebt.currency}`}
        />
        <SummaryRow label="Related member" value={member?.displayName ?? "Unknown"} />
        <SummaryRow label="Event" value={event?.name ?? "Standalone"} />
        {currentDebt.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.summaryLabel}>Notes</Text>
            <Text style={styles.notesText}>{currentDebt.notes}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.activityCard}>
        <SectionTitle
          title="Activity history"
          subtitle="Creation, updates, and payments tied to this debt."
        />
        {activityItems.length > 0 ? (
          activityItems.map((activity, index) => (
            <View
              key={activity.id}
              style={[
                styles.activityRow,
                index === activityItems.length - 1 && styles.activityRowLast,
              ]}
            >
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDetail}>{activity.detail}</Text>
              </View>
              <Text style={styles.activityDate}>{formatDate(activity.createdAt)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No activity yet.</Text>
        )}
      </Card>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      {typeof value === "string" ? (
        <Text style={styles.summaryValue}>{value}</Text>
      ) : (
        value
      )}
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

const styles = StyleSheet.create({
  footerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  overview: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroArtWrap: {
    width: 112,
    height: 88,
    borderRadius: 24,
    backgroundColor: palette.surfaceGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  overviewCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  debtTitle: {
    color: palette.ink,
    fontSize: typography.size.lg,
    lineHeight: typography.line.h3,
    fontFamily: typefaces.displayMedium,
  },
  subtext: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  amountBlock: {
    gap: spacing.xs,
  },
  dueLine: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.bodyStrong,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  summaryValue: {
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
    paddingTop: spacing.sm,
  },
  notesText: {
    color: palette.ink,
    fontSize: typography.size.md,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  activityCard: {
    gap: spacing.sm,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  activityRowLast: {
    borderBottomWidth: 0,
  },
  activityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  activityTitle: {
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
    textTransform: "capitalize",
  },
  activityDetail: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.body,
  },
  activityDate: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  emptyText: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.body,
  },
});