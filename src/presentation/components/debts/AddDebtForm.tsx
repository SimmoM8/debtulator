import {
    Button,
    FieldGroup,
    Picker,
    RNHostView,
    Row,
    Spacer,
    Switch,
    Text,
    TextInput,
} from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useMemo, useState } from "react";
import { View } from "react-native";

import type { CurrencyCode, Member } from "@/src/domain/models";
import { SegmentedControl } from "@/src/presentation/components/controls/SegmentedControl";
import { FormSheet } from "@/src/presentation/components/forms/FormSheet";

type DebtDirection = "you_owe" | "they_owe";

export type AddDebtFormValue = {
  direction: DebtDirection;
  memberId: string;
  amount: number;
  currency: CurrencyCode;
  title: string;
  date: string;
  dueDate: string | null;
};

type AddDebtFormProps = {
  isPresented: boolean;
  members: readonly Member[];
  currencies: readonly CurrencyCode[];
  onDismiss: () => void;
  onSubmit: (value: AddDebtFormValue) => void | Promise<void>;
};

const DIRECTION_OPTIONS = [
  {
    value: "you_owe",
    label: "You owe",
  },
  {
    value: "they_owe",
    label: "They owe",
  },
] as const;

export function AddDebtForm({
  isPresented,
  members,
  currencies,
  onDismiss,
  onSubmit,
}: AddDebtFormProps) {
  const [direction, setDirection] = useState<DebtDirection>("you_owe");

  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(
    currencies[0] ?? "SEK",
  );
  const [title, setTitle] = useState("");

  const [date, setDate] = useState(() => new Date());
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(() => new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = useMemo(() => {
    const parsed = Number(amount.trim().replace(",", "."));

    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const canSubmit =
    memberId.length > 0 &&
    title.trim().length > 0 &&
    parsedAmount > 0 &&
    !isSubmitting;

  function reset() {
    setDirection("you_owe");
    setMemberId("");
    setAmount("");
    setCurrency(currencies[0] ?? "SEK");
    setTitle("");

    setDate(new Date());
    setHasDueDate(false);
    setDueDate(new Date());

    setShowDatePicker(false);
    setShowDueDatePicker(false);
  }

  function dismiss() {
    reset();
    onDismiss();
  }

  async function submit() {
    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        direction,
        memberId,
        amount: parsedAmount,
        currency,
        title: title.trim(),
        date: toDateString(date),
        dueDate: hasDueDate ? toDateString(dueDate) : null,
      });

      reset();
      onDismiss();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormSheet isPresented={isPresented} onDismiss={dismiss}>
      <FieldGroup>
        <FieldGroup.Section>
          <FieldGroup.SectionHeader>
            <Text
              textStyle={{
                fontSize: 28,
                fontWeight: "700",
              }}
            >
              Add Debt
            </Text>
          </FieldGroup.SectionHeader>

          <Row
            style={{
              height: 40,
            }}
          >
            <RNHostView>
              <View
                style={{
                  flex: 1,
                }}
              >
                <SegmentedControl
                  value={direction}
                  options={DIRECTION_OPTIONS}
                  onChange={setDirection}
                />
              </View>
            </RNHostView>
          </Row>
        </FieldGroup.Section>

        <FieldGroup.Section title="Debt">
          <Row alignment="center">
            <Text>Person</Text>

            <Spacer flexible />

            <Picker selectedValue={memberId} onValueChange={setMemberId}>
              <Picker.Item label="Select person" value="" />

              {members.map((member) => (
                <Picker.Item
                  key={member.id}
                  label={member.displayName}
                  value={member.id}
                />
              ))}
            </Picker>
          </Row>

          <Row alignment="center">
            <Text>Amount</Text>

            <Spacer flexible />

            <TextInput
              key={`amount-${isPresented}`}
              placeholder="0.00"
              keyboardType="decimal-pad"
              defaultValue={amount}
              onChangeText={setAmount}
              textAlign="right"
              style={{
                width: 140,
              }}
            />
          </Row>

          <Row alignment="center">
            <Text>Currency</Text>

            <Spacer flexible />

            <Picker
              selectedValue={currency}
              onValueChange={(value) => {
                setCurrency(value as CurrencyCode);
              }}
            >
              {currencies.map((currencyOption) => (
                <Picker.Item
                  key={currencyOption}
                  label={currencyOption}
                  value={currencyOption}
                />
              ))}
            </Picker>
          </Row>

          <TextInput
            key={`title-${isPresented}`}
            placeholder="Description"
            autoCapitalize="sentences"
            returnKeyType="done"
            defaultValue={title}
            onChangeText={setTitle}
            style={{
              height: 44,
            }}
          />
        </FieldGroup.Section>

        <FieldGroup.Section title="Dates">
          <Row alignment="center">
            <Text>Date</Text>

            <Spacer flexible />

            <Button
              variant="text"
              label={formatDate(date)}
              onPress={() => {
                setShowDatePicker(true);
              }}
            />
          </Row>

          <Row alignment="center">
            <Text>Due date</Text>

            <Spacer flexible />

            <Switch
              value={hasDueDate}
              onValueChange={(enabled) => {
                setHasDueDate(enabled);

                if (!enabled) {
                  setShowDueDatePicker(false);
                }
              }}
            />
          </Row>

          {hasDueDate && (
            <Row alignment="center">
              <Text>Due</Text>

              <Spacer flexible />

              <Button
                variant="text"
                label={formatDate(dueDate)}
                onPress={() => {
                  setShowDueDatePicker(true);
                }}
              />
            </Row>
          )}
        </FieldGroup.Section>

        <FieldGroup.Section>
          <Button
            variant="filled"
            label={isSubmitting ? "Adding…" : "Add Debt"}
            onPress={submit}
            disabled={!canSubmit}
          />
        </FieldGroup.Section>

        {showDatePicker && (
          <RNHostView matchContents>
            <DateTimePicker
              value={date}
              mode="date"
              presentation="dialog"
              onValueChange={(_, selectedDate) => {
                setDate(selectedDate);
                setShowDatePicker(false);
              }}
              onDismiss={() => {
                setShowDatePicker(false);
              }}
            />
          </RNHostView>
        )}

        {showDueDatePicker && (
          <RNHostView matchContents>
            <DateTimePicker
              value={dueDate}
              mode="date"
              minimumDate={date}
              presentation="dialog"
              onValueChange={(_, selectedDate) => {
                setDueDate(selectedDate);
                setShowDueDatePicker(false);
              }}
              onDismiss={() => {
                setShowDueDatePicker(false);
              }}
            />
          </RNHostView>
        )}
      </FieldGroup>
    </FormSheet>
  );
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
