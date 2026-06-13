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
import { palette, shadows, typefaces, typography } from "@/src/constants/design";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";
import type { CurrencyCode, DebtDirection } from "@/src/types/models";

export function DebtFormScreen() {
  const { id, memberId, eventId } = useLocalSearchParams<{
    id?: string;
    memberId?: string;
    eventId?: string;
  }>();
  const data = useAppData();
  const auth = useAuth();
  const debt = data.debts.find((item) => item.id === id);
  const selectedEvent = data.events.find(
    (event) => event.id === (debt?.eventId ?? eventId),
  );
  const isSharedEventDebt = !debt && selectedEvent?.visibility === "shared";
  const sharedEventMembers = data.sharedEventMembers.filter(
    (eventMember) =>
      eventMember.eventId === selectedEvent?.id &&
      eventMember.status !== "archived" &&
      eventMember.status !== "merged",
  );
  const currentEventMember = sharedEventMembers.find(
    (member) => member.linkedUserId === auth.identity.authenticatedUserId,
  );

  const [selectedMemberId, setSelectedMemberId] = useState(
    debt?.memberId ?? memberId ?? data.members[0]?.id ?? "",
  );
  const [debtorEventMemberId, setDebtorEventMemberId] = useState(
    currentEventMember?.id ?? sharedEventMembers[0]?.id ?? "",
  );
  const [creditorEventMemberId, setCreditorEventMemberId] = useState(
    sharedEventMembers.find((member) => member.id !== debtorEventMemberId)
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

  const memberOptions = useMemo(
    () =>
      data.members
        .filter((member) => !member.archived)
        .map((member) => ({ label: member.displayName, value: member.id })),
    [data.members],
  );
  const eventMemberOptions = useMemo(
    () =>
      sharedEventMembers.map((member) => ({
        label: member.displayName,
        value: member.id,
      })),
    [sharedEventMembers],
  );
  const usedTagNames = useMemo(
    () => data.tags.map((tag) => tag.name),
    [data.tags],
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  async function save() {
    if (isSharedEventDebt && selectedEvent) {
      await data.createEventDebt({
        eventId: selectedEvent.id,
        remoteEventId: selectedEvent.remoteId,
        creatorUserId: auth.identity.authenticatedUserId,
        debtorEventMemberId,
        creditorEventMemberId,
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
      ...(debt ? {} : { eventId: eventId ?? null }),
    };

    const financialFieldsChanged =
      debt &&
      debt.verificationStatus === "verified" &&
      (selectedMemberId !== debt.memberId ||
        direction !== debt.direction ||
        Number(amount) !== debt.amount ||
        currency !== debt.currency);

    if (financialFieldsChanged) {
      Alert.alert(
        "Verification required again",
        "Changing financial details will require verification again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", style: "destructive", onPress: () => persist(input) },
        ],
      );
      return;
    }

    await persist(input);
  }

  async function persist(input: Parameters<typeof data.createDebt>[0]) {
    if (debt) {
      await data.updateDebt(
        debt.id,
        input,
        auth.identity.authenticatedUserId,
      );
    } else {
      await data.createDebt(input);
    }

    router.back();
  }

  return (
    <Screen
      footer={
        <Button
          title={debt ? "Save debt" : "Create debt"}
          icon="checkmark"
          onPress={save}
          disabled={
            isSharedEventDebt
              ? !debtorEventMemberId ||
                !creditorEventMemberId ||
                debtorEventMemberId === creditorEventMemberId ||
                !title.trim() ||
                Number(amount) <= 0
              : !selectedMemberId || !title.trim() || Number(amount) <= 0
          }
        />
      }
    >
      <PageHeader
        eyebrow={isSharedEventDebt ? "Shared event debt" : "Simple debt"}
        title={debt ? "Edit debt" : "Add debt"}
      />

      <Card tone="lavender">
        {!isSharedEventDebt ? (
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
            label="Amount"
            value={amount}
            onChangeText={(value) => setAmount(sanitizeCurrencyAmount(value))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.amountField}
          />
          <CurrencySelect
            label="Currency"
            value={currency}
            onChange={setCurrency}
            style={styles.currencyField}
          />
        </View>
        {isSharedEventDebt ? (
          <>
            <DropdownSelect
              label="Debtor"
              value={debtorEventMemberId}
              options={eventMemberOptions}
              onChange={setDebtorEventMemberId}
            />
            <DropdownSelect
              label="Creditor"
              value={creditorEventMemberId}
              options={eventMemberOptions}
              onChange={setCreditorEventMemberId}
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

function DirectionToggle({
  value,
  onChange,
}: {
  value: DebtDirection;
  onChange: (value: DebtDirection) => void;
}) {
  const [width, setWidth] = useState(0);
  const translate = React.useRef(
    new Animated.Value(value === "they_owe_me" ? 0 : 1),
  ).current;
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
                  active && styles.directionOptionTextActive,
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
    backgroundColor: "rgba(255,255,255,0.54)",
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
    borderColor: "rgba(55,48,163,0.18)",
    backgroundColor: "rgba(255,255,255,0.72)",
    ...shadows.soft,
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
  directionOptionTextActive: {
    color: palette.primary,
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
  pressed: {
    opacity: 0.76,
  },
});
