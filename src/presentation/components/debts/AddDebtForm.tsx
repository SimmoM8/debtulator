import {
  Button,
  Column,
  Picker,
  Row,
  Spacer,
  Text,
  TextInput,
} from "@expo/ui";
import { useMemo, useState } from "react";

import type { CurrencyCode, DebtDirection } from "@/src/domain/models";
import { FormSheet } from "@/src/presentation/components/forms/FormSheet";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";

const CURRENCIES = ["SEK", "AUD", "EUR", "USD"] as const satisfies readonly CurrencyCode[];

const DIRECTIONS = [
  { value: "they_owe_me", label: "They owe me" },
  { value: "i_owe_them", label: "I owe them" },
] as const satisfies readonly {
  value: DebtDirection;
  label: string;
}[];

type AddDebtFormProps = {
  isPresented: boolean;
  onDismiss: () => void;
};

export function AddDebtForm({ isPresented, onDismiss }: AddDebtFormProps) {
  const data = useAppData();

  const members = useMemo(
    () => data.members.filter((member) => !member.archived),
    [data.members],
  );

  const [direction, setDirection] = useState<DebtDirection>("they_owe_me");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("SEK");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount.replace(",", "."));
  const canSubmit =
    Boolean(memberId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !isSaving;

  async function submit() {
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await data.createDebt({
        memberId,
        direction,
        amount: parsedAmount,
        currency,
        title: title.trim(),
      });

      onDismiss();
    } catch {
      setError("The debt could not be created. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormSheet
      isPresented={isPresented}
      title="Add Debt"
      onDismiss={onDismiss}
    >
      <Column spacing={12}>
        <Row alignment="center" spacing={12}>
          <Text>Direction</Text>
          <Spacer flexible />
          <Picker selectedValue={direction} onValueChange={setDirection}>
            {DIRECTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </Row>

        <Row alignment="center" spacing={12}>
          <Text>Person</Text>
          <Spacer flexible />
          <Picker
            selectedValue={memberId}
            onValueChange={setMemberId}
            enabled={members.length > 0}
          >
            {members.map((member) => (
              <Picker.Item
                key={member.id}
                label={member.displayName}
                value={member.id}
              />
            ))}
          </Picker>
        </Row>

        <TextInput
          placeholder="Amount"
          keyboardType="decimal-pad"
          onChangeText={setAmount}
        />

        <Row alignment="center" spacing={12}>
          <Text>Currency</Text>
          <Spacer flexible />
          <Picker selectedValue={currency} onValueChange={setCurrency}>
            {CURRENCIES.map((currencyCode) => (
              <Picker.Item
                key={currencyCode}
                label={currencyCode}
                value={currencyCode}
              />
            ))}
          </Picker>
        </Row>

        <TextInput
          placeholder="Description"
          autoCapitalize="sentences"
          onChangeText={setTitle}
        />

        {members.length === 0 ? (
          <Text>You need to add a person before creating a debt.</Text>
        ) : null}

        {error ? <Text>{error}</Text> : null}

        <Button
          label={isSaving ? "Adding…" : "Add Debt"}
          disabled={!canSubmit}
          onPress={() => {
            void submit();
          }}
        />
      </Column>
    </FormSheet>
  );
}
