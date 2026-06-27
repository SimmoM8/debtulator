import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AttachmentsSection } from "@/src/components/AttachmentsSection";
import { CommentsSection } from "@/src/components/CommentsSection";
import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import { Badge } from "@/src/components/ui/Badges";
import { Amount } from "@/src/components/ui/Money";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
} from "@/src/components/ui/Primitives";
import {
  palette,
  spacing,
  typefaces,
  typography,
} from "@/src/constants/design";
import {
  activeAttachmentsForTarget,
  attachmentBadges,
} from "@/src/services/attachments";
import { convertCurrency } from "@/src/services/currency";
import {
  debtPdfLines,
  shareExport,
  writePdfExport,
} from "@/src/services/export";
import { respondRemotePaymentConfirmation } from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { formatMoney } from "@/src/utils/money";

export function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const [responding, setResponding] = useState(false);
  const payment = data.payments.find((item) => item.id === id);
  const lines = data.settlementLines.filter((line) => line.paymentId === id);
  const settlement = data.settlements.find((item) =>
    lines.some((line) => line.settlementId === item.id),
  );
  const attachments = payment
    ? activeAttachmentsForTarget(data.attachments, "payment", payment.id)
    : [];
  const attachmentState = attachmentBadges(attachments);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!payment) {
    return (
      <Screen>
        <EmptyState
          title="Payment not found"
          body="This payment may have been archived or removed."
        />
      </Screen>
    );
  }
  const currentPayment = payment;
  const currentUserId = auth.identity.authenticatedUserId;
  const awaitsCurrentUser =
    currentPayment.confirmationStatus === "pending_confirmation" &&
    currentPayment.createdByUserId !== currentUserId &&
    (currentPayment.payerUserId === currentUserId ||
      currentPayment.payeeUserId === currentUserId);

  async function respondToPayment(status: "confirmed" | "rejected") {
    if (!currentUserId || !currentPayment.remoteId || responding) {
      return;
    }
    setResponding(true);
    try {
      await respondRemotePaymentConfirmation({
        paymentRemoteId: currentPayment.remoteId,
        status,
      });
      await data.respondToPaymentConfirmation(
        currentPayment.id,
        status,
        currentUserId,
      );
    } catch {
      Alert.alert(
        "Could not update payment",
        "Your response could not be saved. Please try again.",
      );
    } finally {
      setResponding(false);
    }
  }

  async function exportPdf() {
    const entries = lines
      .map((line) =>
        data.ledgerEntries.find(
          (entry) => entry.sourceId === line.sourceRecordId,
        ),
      )
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const uri = await writePdfExport(
      `debtulator-payment-${currentPayment.id}.pdf`,
      debtPdfLines({
        title: `Payment ${currentPayment.paymentDate}`,
        entries,
        payments: [currentPayment],
        settlements: settlement ? [settlement] : [],
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
      targetType: "payment",
      targetId: currentPayment.id,
      metadata: { uri },
    });
    await shareExport(uri, "Debtulator payment PDF");
  }

  return (
    <Screen>
      <PageHeader title="Payment details" />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Recorded transfer</Text>
            <Text style={styles.heroTitle}>
              Track confirmed money movement separately from the obligations it
              settles.
            </Text>
            <Text style={styles.body}>
              Payments document when cash actually moved, while settlement lines
              explain how that transfer reduced open balances.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="lavender">
        <View style={styles.topRow}>
          <View>
            <Text style={styles.label}>Amount paid</Text>
            <Amount
              amount={convertCurrency(
                payment.amount,
                payment.currency,
                data.settings.baseCurrency,
                data.currencyRates,
              )}
              currency={data.settings.baseCurrency}
              size="lg"
            />
          </View>
          <View style={styles.badgeStack}>
            <Badge
              label={payment.status.replaceAll("_", " ")}
              tone={payment.status === "rejected" ? "negative" : "positive"}
            />
            <Badge
              label={payment.confirmationStatus.replaceAll("_", " ")}
              tone={
                payment.confirmationStatus === "confirmed"
                  ? "positive"
                  : "amber"
              }
            />
            {attachmentState.proofLabel ? (
              <Badge label={attachmentState.proofLabel} tone="positive" />
            ) : null}
          </View>
        </View>
        <InfoRow label="Payment date" value={payment.paymentDate} />
        <InfoRow
          label="Visibility"
          value={payment.visibility.replaceAll("_", " ")}
        />
        <InfoRow label="Sync" value={payment.syncStatus.replaceAll("_", " ")} />
        {payment.notes ? (
          <Text style={styles.body}>{payment.notes}</Text>
        ) : null}
        <Button
          title="Export PDF"
          icon="document-text"
          variant="secondary"
          onPress={exportPdf}
        />
      </Card>

      {awaitsCurrentUser ? (
        <Card tone="amber" style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewEyebrow}>Needs your response</Text>
            <Text style={styles.reviewTitle}>Review payment confirmation</Text>
            <Text style={styles.body}>
              Confirm whether this payment should be applied to the shared debt.
            </Text>
          </View>
          <View style={styles.reviewActions}>
            <Button
              title={responding ? "Confirming..." : "Confirm payment"}
              icon="checkmark"
              disabled={responding}
              onPress={() => {
                void respondToPayment("confirmed");
              }}
              style={styles.reviewButton}
            />
            <Button
              title={responding ? "Rejecting..." : "Reject payment"}
              icon="close"
              variant="danger"
              disabled={responding}
              onPress={() => {
                Alert.alert(
                  "Reject this payment?",
                  "The payment will not be applied to the shared debt.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reject",
                      style: "destructive",
                      onPress: () => {
                        void respondToPayment("rejected");
                      },
                    },
                  ],
                );
              }}
              style={styles.reviewButton}
            />
          </View>
        </Card>
      ) : null}

      <AttachmentsSection
        targetType="payment"
        targetId={payment.id}
        groupId={payment.groupId}
        parentVisibility={payment.visibility}
        preferredKind="proof"
        title="Proof of payment"
      />

      <CommentsSection
        targetType="payment"
        targetId={payment.id}
        groupId={payment.groupId}
        sharedAvailable={
          payment.visibility === "shared_group" ||
          payment.visibility === "shared_with_involved_member"
        }
      />

      <Card>
        <SectionTitle
          title="What this settled"
          subtitle="Settlement lines connect payments to obligations."
        />
        {lines.length > 0 ? (
          lines.map((line) => {
            const entry = data.ledgerEntries.find(
              (item) => item.sourceId === line.sourceRecordId,
            );
            return (
              <View key={line.id} style={styles.row}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>
                    {entry?.title ?? line.sourceRecordType.replaceAll("_", " ")}
                  </Text>
                  <Text style={styles.body}>
                    {line.sourceRecordType.replaceAll("_", " ")}
                  </Text>
                </View>
                <Text style={styles.money}>
                  {formatMoney(
                    convertCurrency(
                      line.appliedAmount,
                      line.currency,
                      data.settings.baseCurrency,
                      data.currencyRates,
                    ),
                    data.settings.baseCurrency,
                  )}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.body}>
            No obligations were linked. This payment is recorded as unallocated.
          </Text>
        )}
      </Card>

      {settlement ? (
        <Card tone="blue">
          <SectionTitle
            title="Settlement record"
            subtitle="This payment is grouped in a settlement record."
          />
          <InfoRow label="Settlement" value={settlement.id} />
          <InfoRow
            label="Total amount"
            value={formatMoney(
              convertCurrency(
                settlement.totalAmount,
                settlement.currency,
                data.settings.baseCurrency,
                data.currencyRates,
              ),
              data.settings.baseCurrency,
            )}
          />
          <InfoRow
            label="Status"
            value={settlement.status.replaceAll("_", " ")}
          />
        </Card>
      ) : null}
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  reviewCard: {
    gap: spacing.lg,
  },
  reviewHeader: {
    gap: spacing.xs,
  },
  reviewEyebrow: {
    color: palette.brand,
    fontSize: typography.size.xs,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewTitle: {
    color: palette.ink,
    fontSize: typography.size.h3,
    fontFamily: typefaces.bodyHeavy,
  },
  reviewActions: {
    gap: spacing.sm,
  },
  reviewButton: {
    width: "100%",
    justifyContent: "center",
    minHeight: 52,
  },
  label: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  flexOne: {
    flex: 1,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: typography.size.lg,
    fontFamily: typefaces.bodyHeavy,
  },
  body: {
    color: palette.muted,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    fontFamily: typefaces.body,
  },
  money: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
  infoValue: {
    color: palette.ink,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
    textAlign: "right",
  },
});
