import ChevronRightIcon from "@expo/material-symbols/chevron_right.xml";

import { Host, Icon, ListItem, Picker, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import type { CurrencyCode } from "@/src/domain/models";
import { renderToolbarAction } from "@/src/navigation/toolbarActions";
import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { SegmentedControl } from "@/src/presentation/components/controls";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { colors } from "@/src/theme";

type DebtDirection = "you_owe" | "they_owe";

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

const CURRENCIES = [
  "SEK",
  "AUD",
  "USD",
  "EUR",
] as const satisfies readonly CurrencyCode[];

const MEMBER_CHEVRON = Icon.select({
  ios: "chevron.right",
  android: ChevronRightIcon,
});

export function NewDebtScreen() {
  const data = useAppData();

  const { memberId } = useLocalSearchParams<{
    memberId?: string;
  }>();

  const selectedMember = useMemo(
    () => data.members.find((member) => member.id === memberId) ?? null,
    [data.members, memberId],
  );

  const [direction, setDirection] = useState<DebtDirection>("you_owe");

  const [amount, setAmount] = useState("");

  const [currency, setCurrency] = useState<CurrencyCode>("SEK");

  const [hasDueDate, setHasDueDate] = useState(false);

  const [dueDate, setDueDate] = useState(() => startOfToday());

  const parsedAmount = useMemo(() => {
    if (amount.length === 0 || amount === ".") {
      return 0;
    }

    const parsed = Number(amount);

    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const canCreate = selectedMember !== null && parsedAmount > 0;

  function changeAmount(candidate: string) {
    const normalized = candidate.replace(",", ".");

    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      setAmount(normalized);
    }
  }

  function createDebt() {
    if (!canCreate || !selectedMember) {
      return;
    }

    const value = {
      direction,
      memberId: selectedMember.id,
      amount: parsedAmount,
      currency,
      dueDate: hasDueDate ? toDateString(dueDate) : null,
    };

    console.log("Create debt", value);

    // Application-layer command comes next.
  }

  function cancelDebtFlow() {
    router.dismissTo("/(tabs)/debts");
  }

  function changeMember() {
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "New Debt",
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Cancel new debt"
          onPress={cancelDebtFlow}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        {renderToolbarAction({
          label: "Create",
          androidIcon: toolbarIcons.check,
          accessibilityLabel: "Create debt",
          disabled: !canCreate,
          onPress: createDebt,
        })}
      </Stack.Toolbar>

      <View style={styles.root}>
        <View style={styles.content}>
          <View style={styles.directionSection}>
            <SegmentedControl
              value={direction}
              options={DIRECTION_OPTIONS}
              onChange={setDirection}
              colorScheme="dark"
            />
          </View>

          <View style={styles.memberCard}>
            <Host
              colorScheme="dark"
              matchContents={{
                vertical: true,
                horizontal: false,
              }}
              style={styles.memberHost}
            >
              <ListItem
                onPress={changeMember}
                supportingText="Tap to change"
                trailing={<Icon name={MEMBER_CHEVRON} size={16} />}
              >
                {selectedMember?.displayName ?? "Select Member"}
              </ListItem>
            </Host>
          </View>

          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <TextInput
                autoFocus
                value={amount}
                onChangeText={changeAmount}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0"
                placeholderTextColor={colors.onDarkBackground}
                selectionColor={colors.onDarkBackground}
                maxLength={12}
                style={styles.amountInput}
              />

              <Host
                colorScheme="dark"
                matchContents={{
                  vertical: true,
                  horizontal: true,
                }}
                style={styles.currencyHost}
              >
                <Picker
                  selectedValue={currency}
                  onValueChange={(value) => {
                    setCurrency(value as CurrencyCode);
                  }}
                >
                  {CURRENCIES.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </Host>
            </View>
          </View>

          <View style={styles.dueDateRow}>
            <Text style={styles.dueDateLabel}>Due date</Text>

            <View style={styles.dueDateValue}>
              {hasDueDate ? (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="compact"
                  minimumDate={startOfToday()}
                  onValueChange={(_, value) => {
                    setDueDate(value);
                  }}
                />
              ) : (
                <Text style={styles.disabledDate}>{formatDate(dueDate)}</Text>
              )}
            </View>

            <Host colorScheme="dark" matchContents style={styles.switchHost}>
              <Switch
                value={hasDueDate}
                onValueChange={(enabled) => {
                  setHasDueDate(enabled);

                  if (enabled && dueDate < startOfToday()) {
                    setDueDate(startOfToday());
                  }
                }}
              />
            </Host>
          </View>
        </View>
      </View>
    </>
  );
}

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mainBackground,
  },

  content: {
    flex: 1,

    paddingHorizontal: 20,
    paddingTop: 18,
  },

  directionSection: {
    width: "100%",
  },

  memberCard: {
    marginTop: 16,

    overflow: "hidden",

    borderRadius: 20,

    backgroundColor: colors.transparent,

    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },

  memberHost: {
    width: "100%",
  },

  amountSection: {
    minHeight: 200,

    alignItems: "center",
    justifyContent: "center",

    paddingVertical: 28,
  },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  amountInput: {
    minWidth: 110,
    maxWidth: 260,
    height: 90,

    paddingHorizontal: 0,
    paddingVertical: 0,

    color: colors.onDarkBackground,

    fontSize: 58,
    fontWeight: "400",

    textAlign: "right",
    textAlignVertical: "center",
  },

  currencyHost: {
    marginLeft: 10,
  },

  dueDateRow: {
    minHeight: 64,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 4,
  },

  dueDateLabel: {
    flex: 1,

    color: colors.onDarkBackground,

    fontSize: 17,
  },

  dueDateValue: {
    minWidth: 124,

    alignItems: "flex-end",
    justifyContent: "center",

    marginRight: 12,
  },

  disabledDate: {
    color: colors.onDarkBackground,

    fontSize: 16,

    opacity: 0.38,
  },

  switchHost: {
    justifyContent: "center",
  },
});
