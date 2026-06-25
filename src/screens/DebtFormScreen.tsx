import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Animated,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CurrencySelect } from "@/src/components/ui/CurrencySelect";
import { TagInput } from "@/src/components/ui/TagInput";
import {
  Button,
  Card,
  DatePickerField,
  DropdownSelect,
  LoadingState,
  PageHeader,
  Screen,
  TextField,
} from "@/src/components/ui/Primitives";
import {
  palette,
  shadows,
  typefaces,
  typography,
} from "@/src/constants/design";
import {
  counterRemoteDebtVerification,
  createRemoteDebtVerification,
  respondRemoteDebtVerification,
} from "@/src/services/stage2Sync";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type {
  CurrencyCode,
  Debt,
  DebtChangeSummary,
  DebtDirection,
  DebtVerification,
  Member,
} from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";

export function DebtFormScreen() {
  const { id, memberId, groupId, counterVerificationId } = useLocalSearchParams<{
    id?: string;
    memberId?: string;
    groupId?: string;
    counterVerificationId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const debt = data.debts.find((item) => item.id === id);
  const selectedGroup = data.groups.find(
    (group) => group.id === (debt?.groupId ?? groupId),
  );
  const isSharedGroupDebt = !debt && selectedGroup?.visibility === "shared";
  const sharedGroupMembers = data.sharedGroupMembers.filter(
    (groupMember) =>
      groupMember.groupId === selectedGroup?.id &&
      groupMember.status !== "archived" &&
      groupMember.status !== "merged",
  );
  const currentGroupMember = sharedGroupMembers.find(
    (member) => member.linkedUserId === auth.identity.authenticatedUserId,
  );

  const [selectedMemberId, setSelectedMemberId] = useState(
    debt?.memberId ?? memberId ?? data.members[0]?.id ?? "",
  );
  const [debtorGroupMemberId, setDebtorGroupMemberId] = useState(
    currentGroupMember?.id ?? sharedGroupMembers[0]?.id ?? "",
  );
  const [creditorGroupMemberId, setCreditorGroupMemberId] = useState(
    sharedGroupMembers.find((member) => member.id !== debtorGroupMemberId)
      ?.id ?? "",
  );
  const [direction, setDirection] = useState<DebtDirection>(
    debt?.direction ?? "they_owe_me",
  );
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(
    debt?.currency ?? "SEK",
  );
  const [title, setTitle] = useState(debt?.title ?? "");
  const [notes, setNotes] = useState(debt?.notes ?? "");
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(debt?.tags ?? []);
  const selectedMember = data.members.find(
    (member) => member.id === selectedMemberId,
  );
  const originalVerification = debt
    ? data.debtVerifications
        .filter(
          (verification) =>
            verification.debtId === debt.id &&
            verification.requestType === "creation",
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
    : undefined;
  const confirmationUserId =
    auth.identity.authenticatedUserId ??
    originalVerification?.requesterUserId ??
    null;

  const memberOptions = useMemo(
    () =>
      data.members
        .filter((member) => !member.archived)
        .map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );
  const groupMemberOptions = useMemo(
    () =>
      sharedGroupMembers.map((member) => ({
        label: member.displayName,
        value: member.id,
      })),
    [sharedGroupMembers],
  );
  const usedTagNames = useMemo(
    () => data.tags.map((tag) => tag.name),
    [data.tags],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    const createdDate = debt?.debtDate ?? todayIsoDate();
    if (dueDate && dueDate < createdDate) {
      Alert.alert(
        "Check due date",
        "The due date cannot be earlier than the date created.",
      );
      return;
    }

    if (isSharedGroupDebt && selectedGroup) {
      await data.createGroupDebt({
        groupId: selectedGroup.id,
        remoteGroupId: selectedGroup.remoteId,
        creatorUserId: auth.identity.authenticatedUserId,
        debtorGroupMemberId,
        creditorGroupMemberId,
        amount: Number(amount),
        currency,
        title,
        notes,
        dueDate,
        tags: selectedTags,
      });
      router.back();
      return;
    }

    const input = {
      memberId: selectedMemberId,
      direction,
      amount: Number(amount),
      currency,
      title,
      notes,
      dueDate,
      tags: selectedTags,
      ...(debt ? {} : { groupId: groupId ?? null }),
      ...(!debt &&
      selectedMember &&
      ["invite_pending", "link_rejected"].includes(selectedMember.linkStatus)
        ? { verificationStatus: "pending" as const }
        : {}),
    };

    const draftSummary = buildChangeSummary(debt, {
      memberId: selectedMemberId,
      amount: Number(amount),
      direction,
      title,
      dueDate: dueDate || null,
    });
    const approvalFieldsChanged = Boolean(
      debt && draftSummary.changedFields.length,
    );
    const memberChanged = Boolean(debt && selectedMemberId !== debt.memberId);
    if (
      memberChanged &&
      debt?.visibility === "shared_with_involved_member"
    ) {
      Alert.alert(
        "Member cannot be changed",
        "A shared debt cannot be transferred between members as one change because that would affect two independent ledgers. Archive this debt with confirmation, then create a new debt for the other member.",
      );
      return;
    }

    const requiresConfirmation =
      approvalFieldsChanged &&
      selectedMember?.linkStatus === "linked" &&
      Boolean(selectedMember.linkedUserId) &&
      Boolean(confirmationUserId);
    const incomingProposal = debt
      ? data.debtVerifications
          .filter(
            (verification) =>
              verification.debtId === debt.id &&
              verification.status === "pending" &&
              verification.responderUserId === confirmationUserId &&
              (verification.id === counterVerificationId ||
                verification.requestType === "creation" ||
                verification.changeSummary?.changedFields.some((field) =>
                  draftSummary.changedFields.includes(field),
                )),
          )
          .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0]
      : undefined;
    if (counterVerificationId && !draftSummary.changedFields.length) {
      Alert.alert(
        "Change something first",
        "A counterproposal must contain a different value from the currently accepted debt.",
      );
      return;
    }
    if (requiresConfirmation && incomingProposal) {
      Alert.alert(
        "A proposal is already waiting for you",
        "The other member has proposed a change to the same debt fields. You can accept their proposal or send your values back as a counterproposal.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Accept theirs",
            onPress: () => void acceptIncomingProposal(incomingProposal),
          },
          {
            text: "Propose mine",
            onPress: () => void persist(input, true, incomingProposal),
          },
        ],
      );
      return;
    }
    if (requiresConfirmation) {
      Alert.alert(
        "Confirmation required",
        "Changing shared debt details requires confirmation from the other member.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save and request confirmation",
            onPress: () => persist(input, true),
          },
        ],
      );
      return;
    }

    await persist(input, Boolean(approvalFieldsChanged));
  }

  async function persist(
    input: Parameters<typeof data.createDebt>[0],
    requestAmendment = false,
    counteredVerification?: DebtVerification,
  ) {
    const savedDebt = debt
      ? await data.updateDebt(debt.id, input, confirmationUserId)
      : await data.createDebt(input);

    const linkedMember = data.members.find(
      (member) => member.id === savedDebt.memberId,
    );
    const shouldRequestConfirmation =
      Boolean(confirmationUserId) &&
      linkedMember?.linkStatus === "linked" &&
      Boolean(linkedMember.linkedUserId) &&
      (!debt || requestAmendment);

    if (counteredVerification) {
      const changeSummary = buildChangeSummary(debt, savedDebt);
      const local = await data.counterDebtVerification(
        counteredVerification.id,
        confirmationUserId!,
        changeSummary,
      );
      try {
        const remote = await counterRemoteDebtVerification({
          verification: counteredVerification,
          changeSummary,
        });
        if (!remote) {
          throw new Error("Cloud counterproposal is unavailable.");
        }
        await data.upsertDebtVerification({
          ...local.verification,
          remoteId: remote.id,
          remoteDebtId: remote.debt_id,
          syncStatus: "synced",
        });
      } catch {
        Alert.alert(
          "Counterproposal pending",
          "Your values were saved locally, but the counterproposal could not be delivered yet.",
        );
      }
    } else if (shouldRequestConfirmation && linkedMember) {
      try {
        await sendConfirmationRequest(
          savedDebt,
          linkedMember,
          !debt || savedDebt.memberId !== debt.memberId
            ? "creation"
            : "amendment",
          buildChangeSummary(debt, savedDebt),
        );
      } catch {
        Alert.alert(
          "Confirmation pending",
          "The debt is marked as awaiting confirmation, but the request could not be delivered yet. You can retry it from the debt options.",
        );
      }
    }

    router.back();
  }

  async function acceptIncomingProposal(verification: DebtVerification) {
    if (!confirmationUserId) {
      return;
    }
    try {
      await respondRemoteDebtVerification({ verification, status: "verified" });
      await data.respondToDebtVerification(
        verification.id,
        "verified",
        confirmationUserId,
      );
      router.back();
    } catch {
      Alert.alert(
        "Could not accept proposal",
        "The proposal is still pending. Please try again.",
      );
    }
  }

  async function sendConfirmationRequest(
    savedDebt: Debt,
    linkedMember: Member,
    requestType: "creation" | "amendment",
    changeSummary: DebtChangeSummary,
  ) {
    const requesterUserId = confirmationUserId;
    const responderUserId = linkedMember.linkedUserId;
    if (!requesterUserId || !responderUserId) {
      return;
    }

    const local = await data.requestDebtVerification(savedDebt.id, {
      requesterUserId,
      responderUserId,
      sharedNotes: savedDebt.sharedNotes ?? savedDebt.notes,
      requestType,
      changeSummary,
    });

    if (!auth.identity.authenticatedUserId) {
      return;
    }

    const remote = await createRemoteDebtVerification({
      debt: local.debt,
      member: linkedMember,
      requesterUserId,
      responderUserId,
      sharedNotes: local.debt.sharedNotes ?? local.debt.notes,
      requestType,
      changeSummary,
    });
    if (!remote) {
      throw new Error("Cloud confirmation is unavailable.");
    }

    await data.upsertDebt({
      ...local.debt,
      remoteId: remote.remoteDebtId,
      syncStatus: "synced",
    });
    await data.upsertDebtVerification({
      ...local.verification,
      remoteId: remote.remoteVerificationId,
      remoteDebtId: remote.remoteDebtId,
      syncStatus: "synced",
    });
  }

  return (
    <Screen
      footer={
        <Button
          title={debt ? "Save debt" : "Create debt"}
          icon="checkmark"
          onPress={save}
          disabled={
            isSharedGroupDebt
              ? !debtorGroupMemberId ||
                !creditorGroupMemberId ||
                debtorGroupMemberId === creditorGroupMemberId ||
                !title.trim() ||
                Number(amount) <= 0
              : !selectedMemberId || !title.trim() || Number(amount) <= 0
          }
        />
      }
    >
      <PageHeader
        eyebrow={isSharedGroupDebt ? "Shared group debt" : "Simple debt"}
        title={debt ? "Edit debt" : "Add debt"}
      />

      <Card tone={direction === "i_owe_them" ? "peach" : "mint"}>
        {!isSharedGroupDebt ? (
          <DirectionToggle value={direction} onChange={setDirection} />
        ) : null}
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Dinner, rent, tickets"
        />
        <View style={styles.amountRow}>
          <TextField
            label={debt ? "Debt amount" : "Amount"}
            value={amount}
            onChangeText={(value) => setAmount(sanitizeCurrencyAmount(value))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.amountField}
          />
          {debt ? (
            <View style={styles.currencyReadOnly}>
              <Text style={styles.currencyReadOnlyLabel}>Currency</Text>
              <View style={styles.currencyReadOnlyValue}>
                <Text style={styles.currencyReadOnlyText}>{debt.currency}</Text>
              </View>
            </View>
          ) : (
            <CurrencySelect
              label="Currency"
              value={currency}
              onChange={setCurrency}
              style={styles.currencyField}
            />
          )}
        </View>
        {debt ? (
          <Text style={styles.amountEditHint}>
            Changing the amount is logged and recalculates the balance against
            all recorded payments.
          </Text>
        ) : null}
        {isSharedGroupDebt ? (
          <>
            <DropdownSelect
              label="Debtor"
              value={debtorGroupMemberId}
              options={groupMemberOptions}
              onChange={setDebtorGroupMemberId}
            />
            <DropdownSelect
              label="Creditor"
              value={creditorGroupMemberId}
              options={groupMemberOptions}
              onChange={setCreditorGroupMemberId}
            />
          </>
        ) : (
          <DropdownSelect
            label="Member"
            value={selectedMemberId}
            options={memberOptions}
            onChange={setSelectedMemberId}
            placeholder="Select member"
          />
        )}
        <DatePickerField
          label="Due date"
          value={dueDate}
          onChange={setDueDate}
          placeholder="No due date"
          minDate={debt?.debtDate ?? todayIsoDate()}
        />
        <TagInput
          value={selectedTags}
          onChange={setSelectedTags}
          usedTags={usedTagNames}
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional details"
          multiline
        />
      </Card>
    </Screen>
  );
}

function buildChangeSummary(
  previousDebt: Debt | undefined,
  proposedDebt: Pick<
    Debt,
    "memberId" | "amount" | "direction" | "title" | "dueDate"
  >,
): DebtChangeSummary {
  const previous = {
    member: previousDebt?.memberId ?? null,
    amount: previousDebt?.amount ?? null,
    direction: previousDebt?.direction ?? null,
    title: previousDebt?.title ?? null,
    dueDate: previousDebt?.dueDate ?? null,
  };
  const proposed = {
    member: proposedDebt.memberId,
    amount: proposedDebt.amount,
    direction: proposedDebt.direction,
    title: proposedDebt.title.trim(),
    dueDate: proposedDebt.dueDate,
  };
  const changedFields: DebtChangeSummary["changedFields"] = [];
  if (!previousDebt || previous.member !== proposed.member) {
    changedFields.push("member");
  }
  if (!previousDebt || previous.amount !== proposed.amount) {
    changedFields.push("amount");
  }
  if (!previousDebt || previous.direction !== proposed.direction) {
    changedFields.push("direction");
  }
  if (!previousDebt || previous.title !== proposed.title) {
    changedFields.push("title");
  }
  if (!previousDebt || previous.dueDate !== proposed.dueDate) {
    changedFields.push("dueDate");
  }

  return { changedFields, previous, proposed };
}

function DirectionToggle({
  value,
  onChange,
}: {
  value: DebtDirection;
  onChange: (value: DebtDirection) => void;
}) {
  const [width, setWidth] = useState(0);
  const [translate] = useState(
    () => new Animated.Value(value === "they_owe_me" ? 0 : 1),
  );
  const segmentWidth = width / DIRECTION_OPTIONS.length;

  React.useEffect(() => {
    Animated.timing(translate, {
      toValue: value === "they_owe_me" ? 0 : segmentWidth,
      duration: 210,
      useNativeDriver: true,
    }).start();
  }, [segmentWidth, translate, value]);

  return (
    <View style={styles.directionField}>
      <Text style={styles.directionLabel}>Direction</Text>
      <View
        style={styles.directionToggle}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {width ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.directionThumb,
              value === "i_owe_them"
                ? styles.directionThumbIOwe
                : styles.directionThumbTheyOwe,
              {
                width: segmentWidth - 6,
                transform: [{ translateX: translate }],
              },
            ]}
          />
        ) : null}
        {DIRECTION_OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.directionOption,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.directionOptionText,
                  active &&
                    (value === "i_owe_them"
                      ? styles.directionOptionTextIOwe
                      : styles.directionOptionTextTheyOwe),
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const DIRECTION_OPTIONS: { label: string; value: DebtDirection }[] = [
  { label: "They owe you", value: "they_owe_me" },
  { label: "You owe them", value: "i_owe_them" },
];

function sanitizeCurrencyAmount(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [wholeRaw = "", ...decimalParts] = normalized.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "");

  if (!decimalParts.length) {
    return whole;
  }

  return `${whole || "0"}.${decimalParts.join("").slice(0, 2)}`;
}

const styles = StyleSheet.create({
  directionField: {
    gap: 10,
  },
  directionLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    letterSpacing: 0.2,
  },
  directionToggle: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderIndigoSoft,
    backgroundColor: "rgba(255,255,255,0.62)",
    padding: 3,
    flexDirection: "row",
    position: "relative",
    overflow: "hidden",
  },
  directionThumb: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 15,
    borderWidth: 1,
    ...shadows.soft,
  },
  directionThumbIOwe: {
    borderColor: "rgba(223,105,70,0.28)",
    backgroundColor: "rgba(253,186,155,0.48)",
  },
  directionThumbTheyOwe: {
    borderColor: "rgba(47,191,143,0.28)",
    backgroundColor: "rgba(47,191,143,0.2)",
  },
  directionOption: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  directionOptionText: {
    color: palette.muted,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  directionOptionTextIOwe: {
    color: "#A8432D",
  },
  directionOptionTextTheyOwe: {
    color: "#14795A",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  amountField: {
    flex: 1,
  },
  currencyField: {
    width: 128,
  },
  currencyReadOnly: {
    width: 128,
    gap: 8,
  },
  currencyReadOnlyLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  currencyReadOnlyValue: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  currencyReadOnlyText: {
    color: palette.ink,
    fontSize: typography.size.base,
    fontFamily: typefaces.bodyStrong,
  },
  amountEditHint: {
    color: palette.faint,
    fontSize: typography.size.xs,
    fontFamily: typefaces.body,
    marginTop: -4,
  },
  pressed: {
    opacity: 0.76,
  },
});
