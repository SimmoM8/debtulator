import { router } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard, ListRow } from "@/src/components/ui/Finance";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
} from "@/src/components/ui/Primitives";
import {
  palette,
  typefaces,
  typography,
} from "@/src/constants/design";
import { entryDirectionText } from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import type {
  LedgerEntry,
  Payment,
  Settlement,
  SettlementLine,
} from "@/src/types/models";
import { formatMoney } from "@/src/utils/money";

type HistoryItem = {
  entry: LedgerEntry;
  lines: SettlementLine[];
  settlements: Settlement[];
  payments: Payment[];
  settledAt: string;
  method: string;
};

export function DebtHistoryScreen() {
  const data = useAppData();

  const historyItems = useMemo(() => {
    return data.ledgerEntries
      .filter(
        (entry) =>
          entry.status !== "archived" &&
          (entry.remainingAmount <= 0.005 ||
            entry.status === "settled" ||
            entry.paymentStatus === "paid"),
      )
      .map((entry) => buildHistoryItem(entry, data.settlementLines, data.settlements, data.payments))
      .sort((first, second) => second.settledAt.localeCompare(first.settledAt));
  }, [data.ledgerEntries, data.payments, data.settlementLines, data.settlements]);

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader eyebrow="Debt history" title="Settled debts" />

      <SectionTitle
        title="Settled"
        action={
          <Text style={styles.countLabel}>
            {historyItems.length} closed
          </Text>
        }
      />

      {historyItems.length ? (
        <GlassCard tone="peach">
          <View style={styles.listColumn}>
            {historyItems.map((item, index) => (
              <ListRow
                key={item.entry.id}
                title={item.entry.title}
                subtitle={[
                  entryDirectionText(
                    item.entry,
                    data.members,
                    data.sharedGroupMembers,
                  ),
                  item.method,
                  `Settled ${formatDate(item.settledAt)}`,
                ].join(" · ")}
                amount={formatMoney(item.entry.originalAmount, item.entry.currency)}
                status={settlementStatusLabel(item)}
                statusTone="teal"
                meta={historyMeta(item)}
                icon={item.entry.groupId ? "people-outline" : "wallet-outline"}
                iconTone={item.entry.groupId ? "teal" : "indigo"}
                showDivider={index < historyItems.length - 1}
                onPress={() => openEntry(item.entry)}
              />
            ))}
          </View>
        </GlassCard>
      ) : (
        <GlassCard tone="lavender">
          <EmptyState
            title="No settled debts"
            body="Paid and manually settled debts will appear here instead of the active Debts list."
          />
        </GlassCard>
      )}
    </Screen>
  );
}

function buildHistoryItem(
  entry: LedgerEntry,
  lines: SettlementLine[],
  settlements: Settlement[],
  payments: Payment[],
): HistoryItem {
  const relatedLines = lines.filter((line) =>
    line.sourceRecordId === entry.sourceId ||
    line.sourceRecordId === entry.id ||
    (entry.expenseId && line.sourceRecordId === entry.expenseId),
  );
  const relatedSettlements = relatedLines
    .map((line) =>
      settlements.find((settlement) => settlement.id === line.settlementId),
    )
    .filter((settlement): settlement is Settlement => Boolean(settlement));
  const relatedPayments = relatedLines
    .map((line) => payments.find((payment) => payment.id === line.paymentId))
    .filter((payment): payment is Payment => Boolean(payment));

  const latestPaymentDate = latestDate(relatedPayments.map((payment) => payment.paymentDate));
  const latestSettlementDate = latestDate(
    relatedSettlements.map((settlement) => settlement.createdAt),
  );
  const latestLineDate = latestDate(relatedLines.map((line) => line.createdAt));
  const settledAt =
    latestPaymentDate ??
    latestSettlementDate ??
    latestLineDate ??
    entry.dueDate ??
    entry.date;

  return {
    entry,
    lines: relatedLines,
    settlements: relatedSettlements,
    payments: relatedPayments,
    settledAt,
    method: settlementMethod(relatedSettlements, relatedPayments, entry),
  };
}

function settlementMethod(
  settlements: Settlement[],
  payments: Payment[],
  entry: LedgerEntry,
) {
  if (payments.length) {
    return payments.length === 1 ? "Paid by payment" : `${payments.length} payments`;
  }
  if (settlements.some((settlement) => settlement.type === "from_suggestion")) {
    return "Settlement suggestion";
  }
  if (settlements.length) {
    return "Manual settlement";
  }
  if (entry.status === "settled") {
    return "Marked settled";
  }
  return "Closed automatically";
}

function settlementStatusLabel(item: HistoryItem) {
  if (item.entry.paymentStatus === "paid") {
    return "Paid";
  }
  if (item.settlements.length) {
    return "Settled";
  }
  return item.entry.status === "settled" ? "Settled" : "Closed";
}

function historyMeta(item: HistoryItem) {
  const paid = item.entry.amountPaid > 0
    ? formatMoney(item.entry.amountPaid, item.entry.currency)
    : formatMoney(item.entry.originalAmount, item.entry.currency);
  const settlementCount = item.settlements.length;
  const paymentCount = item.payments.length;

  if (paymentCount && settlementCount) {
    return `${paid} paid · ${paymentCount} payment${paymentCount === 1 ? "" : "s"} · ${settlementCount} settlement record${settlementCount === 1 ? "" : "s"}`;
  }
  if (paymentCount) {
    return `${paid} paid · ${paymentCount} payment${paymentCount === 1 ? "" : "s"}`;
  }
  if (settlementCount) {
    return `${paid} settled · ${settlementCount} settlement record${settlementCount === 1 ? "" : "s"}`;
  }
  return `${paid} settled`;
}

function latestDate(values: string[]) {
  return values.filter(Boolean).sort((first, second) => second.localeCompare(first))[0];
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function openEntry(
  entry: Pick<LedgerEntry, "kind" | "sourceId" | "expenseId" | "groupId">,
) {
  if (entry.kind === "simple_debt") {
    router.push({ pathname: "/debt/[id]", params: { id: entry.sourceId } });
    return;
  }
  if (entry.kind === "group_direct_debt" && entry.groupId) {
    router.push({ pathname: "/group/[id]", params: { id: entry.groupId } });
    return;
  }
  router.push({
    pathname: "/expense/[id]",
    params: { id: entry.expenseId ?? entry.sourceId },
  });
}

const styles = StyleSheet.create({
  listColumn: {
    gap: 0,
  },
  countLabel: {
    color: palette.textSecondary,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
});
