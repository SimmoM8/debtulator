import { Button, Host, Picker, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

import type { CurrencyCode } from "@/src/domain/models";
import { renderToolbarAction } from "@/src/navigation/toolbarActions";
import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { SegmentedControl } from "@/src/presentation/components/controls";
import { SelectedMemberCard } from "@/src/presentation/components/debts/SelectedMemberCard";
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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);

  const parsedAmount = useMemo(() => {
    if (amount.length === 0 || amount === ".") {
      return 0;
    }

    const parsed = Number(amount);

    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const canCreate = selectedMember !== null && parsedAmount > 0;

  const amountColor =
    direction === "you_owe" ? colors.brand.negative : colors.brand.positive;

  function changeAmount(candidate: string) {
    const normalized = candidate.replace(",", ".");

    /*
     * Because TextInput is controlled, an invalid candidate is never
     * committed to the native input.
     *
     * Valid intermediate states:
     * ""
     * "1"
     * "12"
     * "12."
     * "12.3"
     * "12.34"
     */
    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      setAmount(normalized);
    }
  }

  function toggleDueDate(enabled: boolean) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (!enabled) {
      setShowAndroidDatePicker(false);
    } else if (dueDate < startOfToday()) {
      setDueDate(startOfToday());
    }

    setHasDueDate(enabled);
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
          <SegmentedControl
            value={direction}
            options={DIRECTION_OPTIONS}
            onChange={setDirection}
            colorScheme="dark"
          />

          <View style={styles.memberSection}>
            <SelectedMemberCard
              memberName={selectedMember?.displayName ?? "Select Member"}
              onPress={changeMember}
            />
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
                placeholderTextColor={amountColor}
                selectionColor={amountColor}
                maxLength={12}
                style={[
                  styles.amountInput,
                  {
                    color: amountColor,
                  },
                ]}
              />

              <Host
                colorScheme="dark"
                seedColor={colors.nativeControlTint}
                matchContents
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

            {hasDueDate && (
              <View style={styles.dateControl}>
                {Platform.OS === "ios" ? (
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
                  <Host
                    colorScheme="dark"
                    seedColor={colors.nativeControlTint}
                    matchContents
                  >
                    <Button
                      variant="text"
                      label={formatDate(dueDate)}
                      onPress={() => {
                        setShowAndroidDatePicker(true);
                      }}
                    />
                  </Host>
                )}
              </View>
            )}

            <Host
              colorScheme="dark"
              seedColor={colors.nativeControlTint}
              matchContents
              style={styles.switchHost}
            >
              <Switch value={hasDueDate} onValueChange={toggleDueDate} />
            </Host>
          </View>

          {Platform.OS === "android" && showAndroidDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              presentation="dialog"
              minimumDate={startOfToday()}
              onValueChange={(_, value) => {
                setDueDate(value);
                setShowAndroidDatePicker(false);
              }}
              onDismiss={() => {
                setShowAndroidDatePicker(false);
              }}
            />
          )}
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

  memberSection: {
    marginTop: 16,
  },

  amountSection: {
    minHeight: 210,

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
    maxWidth: 250,
    height: 94,

    paddingHorizontal: 0,
    paddingVertical: 0,

    fontSize: 62,
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

  dateControl: {
    marginRight: 10,
  },

  switchHost: {
    justifyContent: "center",
  },
});
