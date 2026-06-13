import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";

import {
    Button,
    Card,
    LoadingState,
    PageHeader,
    Screen,
    SelectChips,
    TextField,
} from "@/src/components/ui/Primitives";
import { CURRENCIES } from "@/src/constants/currencies";
import { useAppData } from "@/src/state/AppDataProvider";
import type {
    CurrencyCode,
    DebtDirection,
    RecurringTemplateType,
} from "@/src/types/models";
import { todayIsoDate } from "@/src/utils/id";

export function RecurringTemplateFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useAppData();
  const template = data.recurringTemplates.find((item) => item.id === id);
  const [type, setType] = useState<RecurringTemplateType>(
    template?.type ?? "simple_debt",
  );
  const [title, setTitle] = useState(template?.title ?? "");
  const [amount, setAmount] = useState(template ? String(template.amount) : "");
  const [currency, setCurrency] = useState<CurrencyCode>(
    template?.currency ?? data.settings.baseCurrency,
  );
  const [recurrenceRule, setRecurrenceRule] = useState(
    template?.recurrenceRule ?? "monthly",
  );
  const [nextOccurrenceDate, setNextOccurrenceDate] = useState(
    template?.nextOccurrenceDate ?? todayIsoDate(),
  );
  const [memberId, setMemberId] = useState(
    template?.memberId ??
      data.members.find((member) => !member.archived)?.id ??
      "",
  );
  const [groupId, setGroupId] = useState(
    template?.groupId ?? data.groups.find((group) => !group.archived)?.id ?? "",
  );
  const [direction, setDirection] = useState<DebtDirection>(
    (template?.payload.direction as DebtDirection | undefined) ?? "they_owe_me",
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function save() {
    const payload =
      type === "simple_debt"
        ? { memberId, direction, tags: ["Recurring"] }
        : {
            groupId,
            payerId: "me",
            participantIds: [
              "me",
              ...data.groupMembers
                .filter((member) => member.groupId === groupId)
                .map((member) => member.memberId),
            ],
            splitMethod: "equal",
            tags: ["Recurring"],
          };
    if (template) {
      await data.updateRecurringTemplate(template.id, {
        type,
        title,
        amount: Number(amount),
        currency,
        recurrenceRule,
        nextOccurrenceDate,
        memberId: type === "simple_debt" ? memberId : null,
        groupId: type === "shared_expense" ? groupId : null,
        payload,
      });
    } else {
      await data.createRecurringTemplate({
        type,
        title,
        amount: Number(amount),
        currency,
        recurrenceRule,
        startDate: nextOccurrenceDate,
        nextOccurrenceDate,
        memberId: type === "simple_debt" ? memberId : null,
        groupId: type === "shared_expense" ? groupId : null,
        payload,
      });
    }
    router.back();
  }

  function confirmEndRecurring() {
    if (!template) {
      return;
    }

    Alert.alert(
      "End recurring template?",
      "This stops future generated records for this recurring template.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End recurring",
          style: "destructive",
          onPress: () => {
            void data.updateRecurringTemplate(template.id, { status: "ended" });
          },
        },
      ],
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={template ? "Save recurring" : "Create recurring"}
          icon="checkmark"
          onPress={save}
          disabled={!title.trim() || Number(amount) <= 0}
        />
      }
    >
      <PageHeader
        eyebrow="Recurring"
        title={template ? "Edit recurring template" : "Add recurring template"}
      />

      <Card>
        <SelectChips
          label="Type"
          value={type}
          options={[
            { label: "Simple debt", value: "simple_debt" },
            { label: "Shared expense", value: "shared_expense" },
          ]}
          onChange={setType}
        />
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Rent"
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
        <SelectChips
          label="Repeats"
          value={recurrenceRule}
          options={[
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
            { label: "Yearly", value: "yearly" },
          ]}
          onChange={setRecurrenceRule}
        />
        <TextField
          label="Next occurrence"
          value={nextOccurrenceDate}
          onChangeText={setNextOccurrenceDate}
          placeholder="YYYY-MM-DD"
        />
        {type === "simple_debt" ? (
          <>
            <SelectChips
              label="Member"
              value={memberId}
              options={data.members
                .filter((member) => !member.archived)
                .map((member) => ({
                  label: member.displayName,
                  value: member.id,
                }))}
              onChange={setMemberId}
            />
            <SelectChips
              label="Direction"
              value={direction}
              options={[
                { label: "They owe me", value: "they_owe_me" },
                { label: "I owe them", value: "i_owe_them" },
              ]}
              onChange={setDirection}
            />
          </>
        ) : (
          <SelectChips
            label="Group"
            value={groupId}
            options={data.groups
              .filter((group) => !group.archived)
              .map((group) => ({ label: group.name, value: group.id }))}
            onChange={setGroupId}
          />
        )}
      </Card>

      {template ? (
        <Card tone="amber">
          <Button
            title="Pause recurring"
            icon="pause"
            variant="secondary"
            onPress={() =>
              data.updateRecurringTemplate(template.id, { status: "paused" })
            }
          />
          <Button
            title="End recurring"
            icon="stop"
            variant="danger"
            onPress={confirmEndRecurring}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
