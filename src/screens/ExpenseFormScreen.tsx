import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TagInput } from "@/src/components/ui/TagInput";
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
import { participantName } from "@/src/services/ledger";
import {
    buildSplitObligations,
    calculateParticipantShares,
    validateSplit,
} from "@/src/services/splits";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
    CurrencyCode,
    DebtStatus,
    DebtVisibility,
    ExpensePayer,
    ParticipantId,
    SplitMethod,
    VerificationStatus,
} from "@/src/types/models";
import { createId, todayIsoDate } from "@/src/utils/id";
import { formatMoney } from "@/src/utils/money";

export function ExpenseFormScreen() {
  const { id, groupId } = useLocalSearchParams<{
    id?: string;
    groupId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const expense = data.sharedExpenses.find((item) => item.id === id);
  const initialGroupId =
    expense?.groupId ??
    groupId ??
    data.groups.find((group) => !group.archived)?.id ??
    "";

  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const selectedGroup = data.groups.find(
    (group) => group.id === selectedGroupId,
  );
  const isSharedGroup = selectedGroup?.visibility === "shared";
  const groupMemberIds = useMemo(
    () =>
      isSharedGroup
        ? data.sharedGroupMembers
            .filter(
              (groupMember) =>
                groupMember.groupId === selectedGroupId &&
                groupMember.status !== "archived" &&
                groupMember.status !== "merged",
            )
            .map((groupMember) => groupMember.id)
        : data.groupMembers
            .filter((groupMember) => groupMember.groupId === selectedGroupId)
            .map((groupMember) => groupMember.memberId),
    [
      data.groupMembers,
      data.sharedGroupMembers,
      isSharedGroup,
      selectedGroupId,
    ],
  );
  const currentGroupMember = useMemo(
    () =>
      data.sharedGroupMembers.find(
        (member) =>
          isSharedGroup &&
          member.groupId === selectedGroupId &&
          member.linkedUserId === auth.identity.authenticatedUserId &&
          member.status !== "merged",
      ),
    [
      auth.identity.authenticatedUserId,
      data.sharedGroupMembers,
      isSharedGroup,
      selectedGroupId,
    ],
  );
  const defaultParticipants = useMemo<ParticipantId[]>(
    () => (isSharedGroup ? groupMemberIds : ["me", ...groupMemberIds]),
    [groupMemberIds, isSharedGroup],
  );

  const [payerId, setPayerId] = useState<ParticipantId>(
    expense?.payerId ?? currentGroupMember?.id ?? "me",
  );
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(
    expense?.currency ??
      selectedGroup?.defaultCurrency ??
      data.settings.baseCurrency,
  );
  const [title, setTitle] = useState(expense?.title ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate ?? todayIsoDate(),
  );
  const [participantIds, setParticipantIds] = useState<ParticipantId[]>(
    expense?.participantIds ?? defaultParticipants,
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    expense?.splitMethod ?? "equal",
  );
  const [splitAllocations, setSplitAllocations] = useState<
    Record<ParticipantId, string>
  >(
    Object.fromEntries(
      Object.entries(expense?.splitAllocations ?? {}).map(
        ([participantId, value]) => [participantId, String(value)],
      ),
    ),
  );
  const [payerAmounts, setPayerAmounts] = useState<
    Record<ParticipantId, string>
  >(
    Object.fromEntries(
      (expense?.expensePayers ?? []).map((payer) => [
        payer.groupMemberId,
        String(payer.amountPaid),
      ]),
    ),
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    expense?.tags ?? [],
  );
  const [status, setStatus] = useState<DebtStatus>(expense?.status ?? "active");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(expense?.verificationStatus ?? "local_only");

  const groupOptions = useMemo(
    () =>
      data.groups
        .filter((group) => !group.archived)
        .map((group) => ({ label: group.name, value: group.id })),
    [data.groups],
  );
  const participantOptions = useMemo(
    () => [
      ...(isSharedGroup
        ? []
        : [{ label: "You", value: "me" as ParticipantId }]),
      ...groupMemberIds.map((memberId) => ({
        label:
          data.sharedGroupMembers.find((member) => member.id === memberId)
            ?.displayName ??
          data.members.find((member) => member.id === memberId)?.displayName ??
          "Member",
        value: memberId,
      })),
    ],
    [data.members, data.sharedGroupMembers, groupMemberIds, isSharedGroup],
  );
  const usedTagNames = useMemo(
    () => data.tags.map((tag) => tag.name),
    [data.tags],
  );

  const numericSplitAllocations = Object.fromEntries(
    participantIds.map((participantId) => [
      participantId,
      Number(splitAllocations[participantId]) || 0,
    ]),
  ) as Record<ParticipantId, number>;
  const expensePayers = buildPayersForSave(
    expense?.id ?? createId("expense_preview"),
    payerId,
    amount,
    currency,
    payerAmounts,
  );
  const splitErrors = validateSplit({
    amount: Number(amount) || 0,
    participantIds,
    splitMethod,
    splitAllocations: numericSplitAllocations,
    expensePayers,
    currency,
  });
  const shares = calculateParticipantShares({
    amount: Number(amount) || 0,
    participantIds,
    splitMethod,
    splitAllocations: numericSplitAllocations,
  });
  const obligations = buildSplitObligations({
    expenseId: expense?.id ?? createId("expense_preview"),
    groupId: selectedGroupId,
    payerId,
    expensePayers,
    amount: Number(amount) || 0,
    currency,
    participantIds,
    splitMethod,
    splitAllocations: numericSplitAllocations,
  });

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    const visibility: DebtVisibility = isSharedGroup
      ? "shared_group"
      : "private";
    const input = {
      groupId: selectedGroupId,
      creatorUserId: isSharedGroup ? auth.identity.authenticatedUserId : null,
      payerId,
      amount: Number(amount),
      currency,
      title,
      notes,
      expenseDate,
      participantIds,
      splitMethod,
      splitAllocations: numericSplitAllocations,
      expensePayers: buildPayersForSave(
        expense?.id ?? createId("expense_preview"),
        payerId,
        amount,
        currency,
        payerAmounts,
      ).map((payer) => ({
        groupMemberId: payer.groupMemberId,
        amountPaid: payer.amountPaid,
      })),
      tags: selectedTags,
      status,
      verificationStatus,
      visibility,
    };

    if (expense) {
      await data.updateSharedExpense(expense.id, input);
    } else {
      await data.createSharedExpense(input);
    }

    router.back();
  }

  if (data.groups.filter((group) => !group.archived).length === 0) {
    return (
      <Screen>
        <PageHeader
          eyebrow="Shared expense"
          title="Add expense"
        />
        <EmptyState
          title="Create an group first"
          body="Inside groups, Debtulator defaults to shared expenses and equal splits."
          action={
            <Button
              title="Add group"
              icon="people"
              onPress={() => router.push("/group/form")}
            />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={expense ? "Save expense" : "Create expense"}
          icon="checkmark"
          onPress={save}
          disabled={
            !selectedGroupId ||
            !title.trim() ||
            Number(amount) <= 0 ||
            participantIds.length === 0 ||
            splitErrors.length > 0
          }
        />
      }
    >
      <PageHeader
        eyebrow="Shared expense"
        title={expense ? "Edit expense" : "Add expense"}
      />

      <Card tone="peach">
        <SelectChips
          label="Group"
          value={selectedGroupId}
          options={groupOptions}
          onChange={setSelectedGroupId}
        />
        <SelectChips
          label="Primary payer"
          value={payerId}
          options={participantOptions}
          onChange={setPayerId}
        />
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Groceries"
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
          label="Expense date"
          value={expenseDate}
          onChangeText={setExpenseDate}
          placeholder="YYYY-MM-DD"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <TagInput
          value={selectedTags}
          onChange={setSelectedTags}
          usedTags={usedTagNames}
        />
        <MultiSelectChips
          label="Split participants"
          values={participantIds}
          options={participantOptions}
          onChange={setParticipantIds}
        />
        <SelectChips
          label="Split method"
          value={splitMethod}
          options={[
            { label: "Equal", value: "equal" },
            { label: "Custom amounts", value: "custom_amount" },
            { label: "Percentages", value: "custom_percentage" },
            { label: "Shares", value: "shares" },
          ]}
          onChange={setSplitMethod}
        />
        {splitMethod !== "equal"
          ? participantIds.map((participantId) => (
              <TextField
                key={participantId}
                label={`${participantName(participantId, data.members, data.sharedGroupMembers)} ${
                  splitMethod === "custom_amount"
                    ? "amount"
                    : splitMethod === "custom_percentage"
                      ? "percent"
                      : "weight"
                }`}
                value={splitAllocations[participantId] ?? ""}
                onChangeText={(value) =>
                  setSplitAllocations((current) => ({
                    ...current,
                    [participantId]: value,
                  }))
                }
                keyboardType="numeric"
              />
            ))
          : null}
        <SectionTitle
          title="Paid by"
          subtitle="Multiple payer contributions must total the expense amount."
        />
        {participantOptions.map((option) => (
          <TextField
            key={option.value}
            label={`${option.label} paid`}
            value={
              payerAmounts[option.value] ??
              (option.value === payerId &&
              Object.keys(payerAmounts).length === 0
                ? amount
                : "")
            }
            onChangeText={(value) =>
              setPayerAmounts((current) => ({
                ...current,
                [option.value]: value,
              }))
            }
            keyboardType="numeric"
          />
        ))}
        <SelectChips
          label="Status"
          value={status}
          options={[
            { label: "Active", value: "active" },
            { label: "Settled", value: "settled" },
            { label: "Archived", value: "archived" },
          ]}
          onChange={setStatus}
        />
        <SelectChips
          label="Review state"
          value={verificationStatus}
          options={[
            { label: "Local only", value: "local_only" },
            { label: "Pending", value: "pending" },
            { label: "Verified", value: "verified" },
            { label: "Rejected", value: "rejected" },
            { label: "Disputed", value: "disputed" },
            { label: "Resolved", value: "resolved" },
          ]}
          onChange={setVerificationStatus}
        />
      </Card>

      <Card tone="lavender">
        <Text style={styles.label}>Split preview</Text>
        {splitErrors.map((error) => (
          <Text key={error} style={styles.errorText}>
            {error}
          </Text>
        ))}
        {participantIds.map((participantId) => (
          <View key={`share_${participantId}`} style={styles.previewRow}>
            <Text style={styles.previewText}>
              {participantName(
                participantId,
                data.members,
                data.sharedGroupMembers,
              )}{" "}
              share
            </Text>
            <Text style={styles.previewMoney}>
              {formatMoney(shares[participantId] ?? 0, currency)}
            </Text>
          </View>
        ))}
        {obligations.length > 0 ? (
          obligations.map((obligation) => (
            <View key={obligation.id} style={styles.previewRow}>
              <Text style={styles.previewText}>
                {participantName(
                  obligation.fromParticipantId,
                  data.members,
                  data.sharedGroupMembers,
                )}{" "}
                owes{" "}
                {participantName(
                  obligation.toParticipantId,
                  data.members,
                  data.sharedGroupMembers,
                )}
              </Text>
              <Text style={styles.previewMoney}>
                {formatMoney(obligation.amount, obligation.currency)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.previewText}>
            No generated obligations when only the payer is selected.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: palette.brandDark,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyHeavy,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  previewText: {
    flex: 1,
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  previewMoney: {
    color: palette.blue,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyHeavy,
  },
  errorText: {
    color: palette.negative,
    fontSize: typography.size.md,
    fontFamily: typefaces.bodyStrong,
  },
});

function buildPayersForSave(
  expenseId: string,
  payerId: ParticipantId,
  amount: string,
  currency: CurrencyCode,
  payerAmounts: Record<ParticipantId, string>,
): ExpensePayer[] {
  const entries = Object.entries(payerAmounts)
    .map(([groupMemberId, paid]) => ({
      groupMemberId,
      amountPaid: Number(paid) || 0,
    }))
    .filter((payer) => payer.amountPaid > 0);
  const payers = entries.length
    ? entries
    : [{ groupMemberId: payerId, amountPaid: Number(amount) || 0 }];
  return payers.map((payer, index) => ({
    id: `${expenseId}_payer_${payer.groupMemberId}_${index}`,
    expenseId,
    groupMemberId: payer.groupMemberId,
    amountPaid: payer.amountPaid,
    currency,
    createdAt: "",
    updatedAt: "",
  }));
}
