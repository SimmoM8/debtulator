import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AttachmentsSection } from '@/src/components/AttachmentsSection';
import { CommentsSection } from '@/src/components/CommentsSection';
import { Badge } from '@/src/components/ui/Badges';
import { Amount } from '@/src/components/ui/Money';
import { Button, Card, EmptyState, LoadingState, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { attachmentBadges, activeAttachmentsForTarget } from '@/src/services/attachments';
import { debtPdfLines, shareExport, writePdfExport } from '@/src/services/export';
import { participantName } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import { formatMoney } from '@/src/utils/money';

export function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const payment = data.payments.find((item) => item.id === id);
  const lines = data.settlementLines.filter((line) => line.paymentId === id);
  const settlement = data.settlements.find((item) => lines.some((line) => line.settlementId === item.id));
  const payerId = payment?.payerEventMemberId ?? payment?.payerMemberId ?? 'me';
  const payeeId = payment?.payeeEventMemberId ?? payment?.payeeMemberId ?? 'me';
  const attachments = payment ? activeAttachmentsForTarget(data.attachments, 'payment', payment.id) : [];
  const attachmentState = attachmentBadges(attachments);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!payment) {
    return (
      <Screen>
        <EmptyState title="Payment not found" body="This payment may have been archived or removed." />
      </Screen>
    );
  }
  const currentPayment = payment;

  async function exportPdf() {
    const entries = lines
      .map((line) => data.ledgerEntries.find((entry) => entry.sourceId === line.sourceRecordId))
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
          includeRejectedDisputed: data.settings.includeRejectedDisputedInExports,
          includeArchived: data.settings.includeArchivedInExports,
        },
      }),
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: 'pdf',
      targetType: 'payment',
      targetId: currentPayment.id,
      metadata: { uri },
    });
    await shareExport(uri, 'Debtulator payment PDF');
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Payment"
        title={`${participantName(payerId, data.members, data.sharedEventMembers)} paid ${participantName(payeeId, data.members, data.sharedEventMembers)}`}
        subtitle="A payment records real-world money movement."
      />

      <Card tone="mint">
        <View style={styles.topRow}>
          <View>
            <Text style={styles.label}>Amount paid</Text>
            <Amount amount={payment.amount} currency={payment.currency} size="lg" />
          </View>
          <View style={styles.badgeStack}>
            <Badge label={payment.status.replaceAll('_', ' ')} tone={payment.status === 'rejected' ? 'negative' : 'positive'} />
            <Badge label={payment.confirmationStatus.replaceAll('_', ' ')} tone={payment.confirmationStatus === 'confirmed' ? 'positive' : 'amber'} />
            {attachmentState.proofLabel ? <Badge label={attachmentState.proofLabel} tone="positive" /> : null}
          </View>
        </View>
        <InfoRow label="Payment date" value={payment.paymentDate} />
        <InfoRow label="Visibility" value={payment.visibility.replaceAll('_', ' ')} />
        <InfoRow label="Sync" value={payment.syncStatus.replaceAll('_', ' ')} />
        {payment.notes ? <Text style={styles.body}>{payment.notes}</Text> : null}
        <Button title="Export PDF" icon="document-text" variant="secondary" onPress={exportPdf} />
      </Card>

      <AttachmentsSection
        targetType="payment"
        targetId={payment.id}
        eventId={payment.eventId}
        parentVisibility={payment.visibility}
        preferredKind="proof"
        title="Proof of payment"
      />

      <CommentsSection
        targetType="payment"
        targetId={payment.id}
        eventId={payment.eventId}
        sharedAvailable={payment.visibility === 'shared_event' || payment.visibility === 'shared_with_involved_member'}
      />

      <Card>
        <SectionTitle title="What this settled" subtitle="Settlement lines connect payments to obligations." />
        {lines.length > 0 ? (
          lines.map((line) => {
            const entry = data.ledgerEntries.find((item) => item.sourceId === line.sourceRecordId);
            return (
              <View key={line.id} style={styles.row}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>{entry?.title ?? line.sourceRecordType.replaceAll('_', ' ')}</Text>
                  <Text style={styles.body}>{line.sourceRecordType.replaceAll('_', ' ')}</Text>
                </View>
                <Text style={styles.money}>{formatMoney(line.appliedAmount, line.currency)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.body}>No obligations were linked. This payment is recorded as unallocated.</Text>
        )}
      </Card>

      {settlement ? (
        <Card tone="blue">
          <SectionTitle title="Settlement record" subtitle="This payment is grouped in a settlement record." />
          <InfoRow label="Settlement" value={settlement.id} />
          <InfoRow label="Total amount" value={formatMoney(settlement.totalAmount, settlement.currency)} />
          <InfoRow label="Status" value={settlement.status.replaceAll('_', ' ')} />
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  badgeStack: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  label: {
    color: palette.brandDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '800',
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  money: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
