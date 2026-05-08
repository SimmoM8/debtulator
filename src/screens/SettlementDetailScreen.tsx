import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AttachmentsSection } from '@/src/components/AttachmentsSection';
import { CommentsSection } from '@/src/components/CommentsSection';
import { Badge } from '@/src/components/ui/Badges';
import { Card, EmptyState, LoadingState, PageHeader, Screen, SectionTitle, Button } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { attachmentBadges, activeAttachmentsForTarget } from '@/src/services/attachments';
import { debtPdfLines, shareExport, writePdfExport } from '@/src/services/export';
import { participantName } from '@/src/services/ledger';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import { formatMoney } from '@/src/utils/money';

export function SettlementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAppData();
  const auth = useAuth();
  const settlement = data.settlements.find((item) => item.id === id);
  const lines = data.settlementLines.filter((line) => line.settlementId === id);
  const payments = data.payments.filter((payment) => lines.some((line) => line.paymentId === payment.id));
  const attachments = settlement ? activeAttachmentsForTarget(data.attachments, 'settlement', settlement.id) : [];
  const attachmentState = attachmentBadges(attachments);

  if (data.loading) {
    return <LoadingState />;
  }

  if (!settlement) {
    return (
      <Screen>
        <EmptyState title="Settlement not found" body="This settlement may have been archived or removed." />
      </Screen>
    );
  }
  const currentSettlement = settlement;

  async function exportPdf() {
    const entries = lines
      .map((line) => data.ledgerEntries.find((entry) => entry.sourceId === line.sourceRecordId))
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
          includeRejectedDisputed: data.settings.includeRejectedDisputedInExports,
          includeArchived: data.settings.includeArchivedInExports,
        },
      }),
    );
    await data.createExportLog({
      userId: auth.identity.authenticatedUserId,
      exportType: 'pdf',
      targetType: 'settlement',
      targetId: currentSettlement.id,
      metadata: { uri },
    });
    await shareExport(uri, 'Debtulator settlement PDF');
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Settlement record"
        title={settlement.type === 'from_suggestion' ? 'Settlement suggestion accepted' : 'Manual settlement'}
        subtitle="A settlement groups payments and explains which obligations they reduce."
      />

      <Card tone={settlement.status === 'rejected' ? 'coral' : 'lavender'}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.label}>Total amount</Text>
            <Text style={styles.total}>{formatMoney(settlement.totalAmount, settlement.currency)}</Text>
          </View>
          <View style={styles.badgeStack}>
            <Badge label={settlement.status.replaceAll('_', ' ')} tone={settlement.status === 'rejected' ? 'negative' : 'positive'} />
            <Badge label={settlement.confirmationStatus.replaceAll('_', ' ')} tone={settlement.confirmationStatus === 'confirmed' ? 'positive' : 'amber'} />
            {attachmentState.proofLabel ? <Badge label={attachmentState.proofLabel} tone="positive" /> : null}
          </View>
        </View>
        {settlement.notes ? <Text style={styles.body}>{settlement.notes}</Text> : null}
        {settlement.exchangeRateUsed ? (
          <View style={styles.estimateBox}>
            <Badge label="Estimated converted settlement" tone="amber" />
            <Text style={styles.body}>
              Converted {formatMoney(settlement.originalAmount ?? 0, settlement.originalCurrency ?? settlement.currency)} to{' '}
              {formatMoney(settlement.settlementAmount ?? settlement.totalAmount, settlement.settlementCurrency ?? settlement.currency)} using rate{' '}
              {settlement.exchangeRateUsed} from {settlement.exchangeRateDate ?? 'the local table'}.
            </Text>
            <Text style={styles.body}>{settlement.conversionNote ?? 'This conversion is approximate unless both people agree to it.'}</Text>
          </View>
        ) : null}
        <Button title="Export PDF" icon="document-text" variant="secondary" onPress={exportPdf} />
      </Card>

      <AttachmentsSection
        targetType="settlement"
        targetId={settlement.id}
        eventId={settlement.eventId}
        parentVisibility={settlement.eventId ? 'shared_event' : 'private'}
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
        <SectionTitle title="Payments" subtitle="Actual money movement recorded for this settlement." />
        {payments.length > 0 ? (
          payments.map((payment) => {
            const payerId = payment.payerEventMemberId ?? payment.payerMemberId ?? 'me';
            const payeeId = payment.payeeEventMemberId ?? payment.payeeMemberId ?? 'me';
            return (
              <View key={payment.id} style={styles.row}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>
                    {participantName(payerId, data.members, data.sharedEventMembers)} paid{' '}
                    {participantName(payeeId, data.members, data.sharedEventMembers)}
                  </Text>
                  <Text style={styles.body}>{payment.paymentDate}</Text>
                </View>
                <Text style={styles.money}>{formatMoney(payment.amount, payment.currency)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.body}>No payment is linked yet.</Text>
        )}
      </Card>

      <Card>
        <SectionTitle title="Applied obligations" subtitle="Every line shows exactly what this settlement reduced." />
        {lines.map((line) => {
          const entry = data.ledgerEntries.find((item) => item.sourceId === line.sourceRecordId);
          return (
            <View key={line.id} style={styles.row}>
              <View style={styles.flexOne}>
                <Text style={styles.rowTitle}>{entry?.title ?? line.sourceRecordType.replaceAll('_', ' ')}</Text>
                <Text style={styles.body}>
                  Applied {formatMoney(line.appliedAmount, line.currency)}
                  {entry ? `, remaining ${formatMoney(entry.remainingAmount, entry.currency)}` : ''}
                </Text>
              </View>
              {entry ? <Badge label={entry.paymentStatus.replaceAll('_', ' ')} tone={entry.paymentStatus === 'overpaid' ? 'amber' : 'blue'} /> : null}
            </View>
          );
        })}
      </Card>

      <Card tone="blue">
        <SectionTitle title="Explanation" subtitle="Settlement records do not create debts." />
        <Text style={styles.body}>
          This record documents a payment and applies it to {lines.length} open obligation{lines.length === 1 ? '' : 's'}. Paid rows are excluded
          from future open settlement suggestions; partial rows contribute only their remaining amount.
        </Text>
        {payments[0] ? (
          <Button title="Open payment" icon="card" variant="secondary" onPress={() => router.push({ pathname: '/payment/[id]', params: { id: payments[0].id } })} />
        ) : null}
      </Card>
    </Screen>
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
  total: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '900',
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
  estimateBox: {
    gap: spacing.sm,
  },
});
