import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/src/components/ui/Badges";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    MultiSelectChips,
    PageHeader,
    Screen,
    SectionTitle,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import {
    entryDirectionText,
    participantName,
    sourceRecordTypeForEntry,
} from "@/src/services/ledger";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    CurrencyCode,
    LedgerEntry,
    ParticipantId,
} from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";
import { formatMoney, roundMoney } from "@/src/utils/money";

export function PaymentFormScreen() {
  const {
    debtId,
    groupId,
    memberId,
    payerId: initialPayerId,
    payeeId: initialPayeeId,
  } = useLocalSearchParams<{
    debtId?: string;
    groupId?: string;
    memberId?: string;
    payerId?: string;
    payeeId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const focusedEntry = useMemo(
    () =>
      data.ledgerEntries.find(
        (entry) =>
          entry.sourceId === debtId ||
          entry.id === debtId ||
          (entry.kind === "expense_obligation" && entry.sourceId === debtId),
      ),
    [data.ledgerEntries, debtId],
  );
  const candidateEntries = useMemo(
    () =>
      data.ledgerEntries.filter((entry) => {
        if (
          entry.remainingAmount <= 0.005 ||
          entry.currency !== (focusedEntry?.currency ?? entry.currency)
        ) {
          return false;
        }
        if (groupId || focusedEntry?.groupId) {
          return entry.groupId === (groupId ?? focusedEntry?.groupId);
        }
        if (memberId || focusedEntry) {
          const targetMemberId =
            memberId ??
            (focusedEntry?.fromId === "me"
              ? focusedEntry.toId
              : focusedEntry?.fromId);
          return (
            entry.fromId === targetMemberId ||
            entry.toId === targetMemberId ||
            entry.sourceId === focusedEntry?.sourceId
          );
        }
        return true;
      }),
    [data.ledgerEntries, groupId, focusedEntry, memberId],
  );
  const defaultPayer = initialPayerId ?? focusedEntry?.fromId ?? "me";
  const defaultPayee = initialPayeeId ?? focusedEntry?.toId ?? "me";
  const [payerId, setPayerId] = useState<ParticipantId>(defaultPayer);
  const [payeeId, setPayeeId] = useState<ParticipantId>(defaultPayee);
  const [currency, setCurrency] = useState<CurrencyCode>(
    focusedEntry?.currency ?? data.settings.baseCurrency,
  );
  const [amount, setAmount] = useState(
    String(focusedEntry?.remainingAmount ?? ""),
  );
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>(
    focusedEntry ? [focusedEntry.id] : [],
  );

  const participantOptions = useMemo(
    () =>
      buildParticipantOptions(data, groupId ?? focusedEntry?.groupId ?? null),
    [data, groupId, focusedEntry?.groupId],
  );
  const selectedEntries = candidateEntries.filter((entry) =>
    selectedEntryIds.includes(entry.id),
  );
  const previewLines = autoApplyLines(selectedEntries, Number(amount) || 0);
  const appliedTotal = roundMoney(
    previewLines.reduce((total, line) => total + line.appliedAmount, 0),
  );
  const overpayment = roundMoney(
    Math.max((Number(amount) || 0) - appliedTotal, 0),
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function save() {
    if (payerId === payeeId) {
      Alert.alert(
        "Choose two people",
        "A payment needs a payer and a receiver.",
      );
      return;
    }
    if ((Number(amount) || 0) <= 0) {
      Alert.alert("Enter an amount", "The payment amount must be above zero.");
      return;
    }
    const lines = previewLines.map((line) => ({
      sourceRecordType: sourceRecordTypeForEntry(line.entry),
      sourceRecordId: line.entry.sourceId,
      appliedAmount: line.appliedAmount,
    }));
    const focusedDebt =
      focusedEntry?.kind === "simple_debt"
        ? data.debts.find((debt) => debt.id === focusedEntry.sourceId)
        : undefined;
    const focusedMember = focusedDebt
      ? data.members.find((member) => member.id === focusedDebt.memberId)
      : undefined;
    const sharedWithLinkedMember =
      focusedMember?.linkStatus === "linked" &&
      Boolean(focusedMember.linkedUserId) &&
      Boolean(auth.identity.authenticatedUserId);
    const currentUserId = auth.identity.authenticatedUserId;
    const linkedUserId = focusedMember?.linkedUserId ?? null;
    const createPayment = async () => {
      const result = await data.createPaymentSettlement({
        payerId,
        payeeId,
        amount: Number(amount),
        currency,
        paymentDate,
        notes,
        groupId: groupId ?? focusedEntry?.groupId ?? null,
        relatedMemberId:
          memberId ??
          (!groupId && payerId !== "me"
            ? payerId
            : payeeId !== "me"
              ? payeeId
              : null),
        visibility: sharedWithLinkedMember
          ? "shared_with_involved_member"
          : undefined,
        confirmationStatus: sharedWithLinkedMember
          ? "pending_confirmation"
          : undefined,
        createdByUserId: currentUserId,
        payerUserId:
          sharedWithLinkedMember
            ? payerId === "me"
              ? currentUserId
              : linkedUserId
            : undefined,
        payeeUserId:
          sharedWithLinkedMember
            ? payeeId === "me"
              ? currentUserId
              : linkedUserId
            : undefined,
        lines,
        settlementType: "manual",
      });
      router.replace({
        pathname: "/settlement/[id]",
        params: { id: result.settlement.id },
      });
    };

    if (sharedWithLinkedMember) {
      Alert.alert(
        "Confirmation required",
        "This payment will require confirmation from the other member.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Make payment",
            onPress: () => {
              void createPayment();
            },
          },
        ],
      );
      return;
    }

    await createPayment();
  }

  if (candidateEntries.length === 0 && !focusedEntry) {
    return (
      <Screen>
        <PageHeader eyebrow="Record payment" title="Record payment" />
        <EmptyState
          title="No open obligations"
          body="There are no unpaid records available for this payment context."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title="Save payment"
          icon="checkmark"
          onPress={save}
          disabled={!payerId || !payeeId || Number(amount) <= 0}
        />
      }
    >
      <PageHeader eyebrow="Record payment" title="Record payment" />

      <Card tone="lavender">
        <SelectChips
          label="Payer"
          value={payerId}
          options={participantOptions}
          onChange={setPayerId}
        />
        <SelectChips
          label="Receiver"
          value={payeeId}
          options={participantOptions}
          onChange={setPayeeId}
        />
        <TextField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <SelectChips
          label="Currency"
          value={currency}
          options={CURRENCIES.map((currencyCode) => ({
            label: currencyCode,
            value: currencyCode,
          }))}
          onChange={setCurrency}
        />
        <TextField
          label="Payment date"
          value={paymentDate}
          onChangeText={setPaymentDate}
          placeholder="YYYY-MM-DD"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </Card>

      <Card>
        <SectionTitle
          title="Apply to open records"
          subtitle="Default auto-apply uses oldest open records until the payment amount is consumed."
          action={
            <Button
              title="Auto-apply"
              icon="flash"
              variant="secondary"
              onPress={() =>
                setSelectedEntryIds(candidateEntries.map((entry) => entry.id))
              }
            />
          }
        />
        <MultiSelectChips
          label="Open obligations"
          values={selectedEntryIds}
          options={candidateEntries.map((entry) => ({
            label: `${entry.title} ${formatMoney(entry.remainingAmount, entry.currency)}`,
            value: entry.id,
          }))}
          onChange={setSelectedEntryIds}
        />
      </Card>

      <Card tone={overpayment > 0 ? "amber" : "peach"}>
        <SectionTitle
          title="Settlement preview"
          subtitle="This preview is what the settlement record will explain."
        />
        {previewLines.map((line) => (
          <View key={line.entry.id} style={styles.row}>
            <View style={styles.flexOne}>
              <Text style={styles.rowTitle}>{line.entry.title}</Text>
              <Text style={styles.body}>
                {entryDirectionText(
                  line.entry,
                  data.members,
                  data.sharedGroupMembers,
                )}
              </Text>
            </View>
            <Text style={styles.money}>
              {formatMoney(line.appliedAmount, line.entry.currency)}
            </Text>
          </View>
        ))}
        <View style={styles.badgeLine}>
          <Badge
            label={`${formatMoney(appliedTotal, currency)} applied`}
            tone="positive"
          />
          {overpayment > 0 ? (
            <Badge
              label={`Overpaid by ${formatMoney(overpayment, currency)}`}
              tone="amber"
            />
          ) : null}
        </View>
        {overpayment > 0 ? (
          <Text style={styles.body}>
            This creates an unallocated credit from{" "}
            {participantName(payeeId, data.members, data.sharedGroupMembers)} to{" "}
            {participantName(payerId, data.members, data.sharedGroupMembers)}.
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

function autoApplyLines(entries: LedgerEntry[], amount: number) {
  let remaining = roundMoney(amount);
  return [...entries]
    .sort((first, second) => first.date.localeCompare(second.date))
    .map((entry) => {
      const appliedAmount = roundMoney(
        Math.min(entry.remainingAmount, remaining),
      );
      remaining = roundMoney(remaining - appliedAmount);
      return { entry, appliedAmount };
    })
    .filter((line) => line.appliedAmount > 0.005);
}

function buildParticipantOptions(
  data: ReturnType<typeof useAppData>,
  groupId: string | null,
) {
  if (groupId) {
    const members = data.sharedGroupMembers.filter(
      (member) => member.groupId === groupId && member.status !== "merged",
    );
    return members.map((member) => ({
      label: member.alias || member.displayName,
      value: member.id as ParticipantId,
    }));
  }
  return [
    { label: "You", value: "me" as ParticipantId },
    ...data.members
      .filter((member) => !member.archived)
      .map((member) => ({
        label: member.displayName,
        value: member.id as ParticipantId,
      })),
  ];
}

const styles = StyleSheet.create({
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
  badgeLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
