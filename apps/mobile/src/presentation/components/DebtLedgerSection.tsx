import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard, ListRow } from "@/src/presentation/design-system/Finance";
import { DebtDirectionIcon } from "@/src/presentation/design-system/DebtDirectionIcon";
import { SectionTitle } from "@/src/presentation/design-system/Primitives";
import { palette, typefaces, typography } from "@/src/presentation/theme/design";
import { estimateMoneyMap } from "@debtulator/domain/finance/currencyConversion";
import { entryDirectionText } from "@debtulator/domain/ledger/ledger";
import type {
  AppSettings,
  CurrencyCode,
  CurrencyRate,
  LedgerEntry,
  Member,
  SharedGroupMember,
} from "@debtulator/domain/models";
import { formatMoney } from "@debtulator/domain/finance/money";
import { routes } from '@/src/presentation/navigation/routes';

export function DebtLedgerSection({
  title,
  subtitle,
  entries,
  summaryAmount,
  summaryTone,
  members,
  sharedGroupMembers,
}: {
  title: string;
  subtitle: string;
  entries: LedgerEntry[];
  summaryAmount: string;
  summaryTone: "positive" | "negative" | "neutral";
  members: Member[];
  sharedGroupMembers: SharedGroupMember[];
}) {
  if (!entries.length) return null;

  return (
    <>
      <SectionTitle
        title={title}
        subtitle={subtitle}
        action={
          <Text
            style={[
              styles.sectionAmount,
              summaryTone === "positive"
                ? styles.sectionAmountPositive
                : summaryTone === "negative"
                  ? styles.sectionAmountNegative
                  : styles.sectionAmountNeutral,
            ]}
          >
            {summaryAmount}
          </Text>
        }
      />
      <DebtLedgerList
        entries={entries}
        members={members}
        sharedGroupMembers={sharedGroupMembers}
        tone={title === "You owe" ? "coral" : "lavender"}
      />
    </>
  );
}

export function DebtLedgerList({
  entries,
  members,
  sharedGroupMembers,
  tone = "lavender",
}: {
  entries: LedgerEntry[];
  members: Member[];
  sharedGroupMembers: SharedGroupMember[];
  tone?: "coral" | "lavender";
}) {
  if (!entries.length) return null;

  return (
    <GlassCard tone={tone}>
      <View style={styles.listColumn}>
        {entries.map((entry, index) => (
          <ListRow
            key={entry.id}
            title={entry.title}
            subtitle={
              entry.groupId
                ? "Shared"
                : entry.kind === "expense_obligation"
                  ? "Bills"
                  : entryDirectionText(entry, members, sharedGroupMembers)
            }
            amount={formatMoney(
              entry.remainingAmount <= 0.005
                ? entry.originalAmount
                : entry.remainingAmount,
              entry.currency as CurrencyCode,
            )}
            trailingLabel={debtDueLabel(entry)}
            trailingTone={debtDueTone(entry)}
            leadingIcon={
              <DebtDirectionIcon
                direction={entry.fromId === "me" ? "owing" : "owed"}
              />
            }
            iconTone={entry.fromId === "me" ? "coral" : "teal"}
            showDivider={index < entries.length - 1}
            onPress={() => openEntry(entry)}
          />
        ))}
      </View>
    </GlassCard>
  );
}

export function debtSectionTotalLabel(
  entries: LedgerEntry[],
  settings: AppSettings,
  currencyRates: CurrencyRate[],
) {
  const totalsByCurrency = entries.reduce<Record<string, number>>((acc, entry) => {
    const amount = entry.remainingAmount <= 0.005 ? entry.originalAmount : entry.remainingAmount;
    acc[entry.currency] = (acc[entry.currency] ?? 0) + amount;
    return acc;
  }, {});
  return formatMoney(
    estimateMoneyMap(totalsByCurrency, settings, currencyRates),
    settings.baseCurrency,
  );
}

function openEntry(entry: Pick<LedgerEntry, "kind" | "sourceId" | "expenseId" | "groupId">) {
  if (entry.kind === "simple_debt") {
    router.push(routes.debtDetail(entry.sourceId));
  } else if (entry.kind === "group_direct_debt" && entry.groupId) {
    router.push(routes.groupDetail(entry.groupId));
  } else {
    router.push(routes.expenseDetail(entry.expenseId ?? entry.sourceId));
  }
}

function debtDueLabel(entry: LedgerEntry) {
  if (entry.remainingAmount <= 0.005 || entry.status === "settled") return "Settled";
  if (!entry.dueDate) return entry.toId === "me" ? "Waiting on them" : "No due date";
  const today = new Date().toISOString().slice(0, 10);
  if (entry.dueDate < today) return "Overdue";
  const days = Math.max(0, Math.round((new Date(`${entry.dueDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000));
  return days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

function debtDueTone(entry: LedgerEntry): "teal" | "amber" | "coral" | "muted" | "indigo" {
  if (entry.remainingAmount <= 0.005 || entry.status === "settled") return "teal";
  if (!entry.dueDate) return "muted";
  const today = new Date().toISOString().slice(0, 10);
  if (entry.dueDate < today) return "coral";
  const days = Math.max(0, Math.round((new Date(`${entry.dueDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000));
  return days <= 2 ? "coral" : "indigo";
}

const styles = StyleSheet.create({
  listColumn: { gap: 0 },
  sectionAmount: { fontSize: typography.size.base, fontFamily: typefaces.bodyHeavy },
  sectionAmountPositive: { color: palette.positive },
  sectionAmountNegative: { color: palette.negative },
  sectionAmountNeutral: { color: palette.muted },
});
