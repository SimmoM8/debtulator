import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AttachmentsSection } from "@/src/components/AttachmentsSection";
import { CommentsSection } from "@/src/components/CommentsSection";
import { DebtulatorShieldIllustration } from "@/src/components/illustrations/DebtulatorShieldIllustration";
import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
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
import { convertCurrency } from "@/src/services/currency";
import { participantName } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import { formatMoney } from "@/src/utils/money";

export function SettlementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const settlement = data.settlements.find((item) => item.id === id);
  const lines = data.settlementLines.filter((line) => line.settlementId === id);
  const payments = data.payments.filter((payment) =>
    lines.some((line) => line.paymentId === payment.id),
  );
  const attachments = settlement
    ? activeAttachmentsForTarget(data.attachments, "settlement", settlement.id)
    : [];
  const attachmentState = attachmentBadges(attachments);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!settlement) {
    return (
      <Screen>
        <EmptyState
          title="Settlement not found"
          body="This settlement may have been archived or removed."
        />
      </Screen>
    );
  }
  const currentSettlement = settlement;

  async function exportPdf() {
    const entries = lines
      .map((line) =>
        data.ledgerEntries.find(
          (entry) => entry.sourceId === line.sourceRecordId,
        ),
      )
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const uri = await writePdfExport(
      `debtulator-settlement-${currentSettlement.id}.pdf`,
      debtPdfLines({
        title: `Settlement ${currentSettlement.createdAt.slice(0, 10)}`,
        entries,
        payments,
        settlements: [currentSettlement],
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
      targetType: "settlement",
      targetId: currentSettlement.id,
      metadata: { uri },
    });
    await shareExport(uri, "Debtulator settlement PDF");
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Settlement record"
        title={
          settlement.type === "from_suggestion"
            ? "Settlement suggestion accepted"
            : "Manual settlement"
        }
        subtitle="A settlement groups payments and explains which obligations they reduce."
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Settlement audit</Text>
            <Text style={styles.heroTitle}>
              Bundle payment proof and applied obligations into one reviewable
              record.
            </Text>
            <Text style={styles.body}>
              Settlements keep explanation, conversion context, and supporting
              evidence together so future suggestions stay accurate.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorShieldIllustration width={128} height={100} />
          </View>
        </View>
      </Card>

      <Card tone={settlement.status === "rejected" ? "coral" : "lavender"}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.label}>Total amount</Text>
            <Text style={styles.total}>
              {formatMoney(
                convertCurrency(
                  settlement.totalAmount,
                  settlement.currency,
                  data.settings.baseCurrency,
                  data.currencyRates,
                ),
                data.settings.baseCurrency,
              )}
            </Text>
          </View>
          <View style={styles.badgeStack}>
            <Badge
              label={settlement.status.replaceAll("_", " ")}
              tone={settlement.status === "rejected" ? "negative" : "positive"}
            />
            <Badge
              label={settlement.confirmationStatus.replaceAll("_", " ")}
              tone={
                settlement.confirmationStatus === "confirmed"
                  ? "positive"
                  : "amber"
              }
            />
            {attachmentState.proofLabel ? (
              <Badge label={attachmentState.proofLabel} tone="positive" />
            ) : null}
          </View>
        </View>
        {settlement.notes ? (
          <Text style={styles.body}>{settlement.notes}</Text>
        ) : null}
        {settlement.exchangeRateUsed ? (
          <View style={styles.estimateBox}>
            <Badge label="Estimated converted settlement" tone="amber" />
            <Text style={styles.body}>
              {formatMoney(
                convertCurrency(
                  settlement.settlementAmount ?? settlement.totalAmount,
                  settlement.settlementCurrency ?? settlement.currency,
                  data.settings.baseCurrency,
                  data.currencyRates,
                ),
                data.settings.baseCurrency,
              )}{" "}
              using rate {settlement.exchangeRateUsed} from{" "}
              {settlement.exchangeRateDate ?? "the local table"}.
            </Text>
            <Text style={styles.body}>
              {settlement.conversionNote ??
                "This conversion is approximate unless both people agree to it."}
            </Text>
          </View>
        ) : null}
        <Button
          title="Export PDF"
          icon="document-text"
          variant="secondary"
          onPress={exportPdf}
        />
      </Card>

      <AttachmentsSection
        targetType="settlement"
        targetId={settlement.id}
        eventId={settlement.eventId}
        parentVisibility={settlement.eventId ? "shared_event" : "private"}
        preferredKind="proof"
        title="Proof of settlement"
      />

      <CommentsSection
        targetType="settlement"
        targetId={settlement.id}
        eventId={settlement.eventId}
        sharedAvailable={Boolean(settlement.eventId)}
      />

      <Card>
        <SectionTitle
          title="Payments"
          subtitle="Actual money movement recorded for this settlement."
        />
        {payments.length > 0 ? (
          payments.map((payment) => {
            const payerId =
              payment.payerEventMemberId ?? payment.payerMemberId ?? "me";
            const payeeId =
              payment.payeeEventMemberId ?? payment.payeeMemberId ?? "me";
            return (
              <View key={payment.id} style={styles.row}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>
                    {participantName(
                      payerId,
                      data.members,
                      data.sharedEventMembers,
                    )}{" "}
                    paid{" "}
                    {participantName(
                      payeeId,
                      data.members,
                      data.sharedEventMembers,
                    )}
                  </Text>
                  <Text style={styles.body}>{payment.paymentDate}</Text>
                </View>
                <Text style={styles.money}>
                  {formatMoney(
                    convertCurrency(
                      payment.amount,
                      payment.currency,
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
          <Text style={styles.body}>No payment is linked yet.</Text>
        )}
      </Card>

      <Card>
        <SectionTitle
          title="Applied obligations"
          subtitle="Every line shows exactly what this settlement reduced."
        />
        {lines.map((line) => {
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
                  Applied{" "}
                  {formatMoney(
                    convertCurrency(
                      line.appliedAmount,
                      line.currency,
                      data.settings.baseCurrency,
                      data.currencyRates,
                    ),
                    data.settings.baseCurrency,
                  )}
                  {entry
                    ? `, remaining ${formatMoney(
                        convertCurrency(
                          entry.remainingAmount,
                          entry.currency,
                          data.settings.baseCurrency,
                          data.currencyRates,
                        ),
                        data.settings.baseCurrency,
                      )}`
                    : ""}
                </Text>
              </View>
              {entry ? (
                <Badge
                  label={entry.paymentStatus.replaceAll("_", " ")}
                  tone={entry.paymentStatus === "overpaid" ? "amber" : "blue"}
                />
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card tone="blue">
        <SectionTitle
          title="Explanation"
          subtitle="Settlement records do not create debts."
        />
        <Text style={styles.body}>
          This record documents a payment and applies it to {lines.length} open
          obligation{lines.length === 1 ? "" : "s"}. Paid rows are excluded from
          future open settlement suggestions; partial rows contribute only their
          remaining amount.
        </Text>
        {payments[0] ? (
          <Button
            title="Open payment"
            icon="card"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/payment/[id]",
                params: { id: payments[0].id },
              })
            }
          />
        ) : null}
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
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: typefaces.displayMedium,
  },
  heroArtWrap: {
    width: 140,
    height: 110,
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
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  total: {
    color: palette.ink,
    fontSize: 30,
    fontFamily: typefaces.bodyHeavy,
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
    fontSize: 15,
    fontFamily: typefaces.bodyHeavy,
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typefaces.body,
  },
  money: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: typefaces.bodyHeavy,
  },
  estimateBox: {
    gap: spacing.sm,
  },
});
