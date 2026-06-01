import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
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
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
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
  const [eventId, setEventId] = useState(
    template?.eventId ?? data.events.find((event) => !event.archived)?.id ?? "",
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
            eventId,
            payerId: "me",
            participantIds: [
              "me",
              ...data.eventMembers
                .filter((member) => member.eventId === eventId)
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
        eventId: type === "shared_expense" ? eventId : null,
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
        eventId: type === "shared_expense" ? eventId : null,
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
        subtitle="Due records reference this template and are never generated twice for the same date."
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Repeatable patterns</Text>
            <Text style={styles.heroTitle}>
              Describe the recurring rule once, then keep future generated
              records traceable back to this source template.
            </Text>
            <Text style={styles.body}>
              Templates help automate predictable debt or expense creation
              without losing the ability to pause, end, or inspect the cadence.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

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
            label="Event"
            value={eventId}
            options={data.events
              .filter((event) => !event.archived)
              .map((event) => ({ label: event.name, value: event.id }))}
            onChange={setEventId}
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
  body: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
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
});
