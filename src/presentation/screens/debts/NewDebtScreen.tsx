import { Host, ListItem, Switch, Text, TextInput } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

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

  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(() => startOfToday());

  const [amount, setAmount] = useState("");

  const parsedAmount = useMemo(() => {
    if (amount.length === 0 || amount === ".") {
      return 0;
    }

    const parsed = Number(amount);

    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  function changeAmount(candidate: string) {
    const normalized = candidate.replace(",", ".");

    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      setAmount(normalized);
    }
  }

  const canCreate = selectedMember !== null && parsedAmount > 0;
  function createDebt() {
    if (!canCreate || !selectedMember) {
      return;
    }

    const value = {
      direction,
      memberId: selectedMember.id,
      amount: parsedAmount,
      currency: "SEK" as const,
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
        <View style={styles.directionSection}>
          <SegmentedControl
            value={direction}
            options={DIRECTION_OPTIONS}
            onChange={setDirection}
          />
        </View>

        <Host
          matchContents={{ vertical: true, horizontal: false }}
          style={styles.memberHost}
        >
          <ListItem onPress={changeMember}>
            {selectedMember?.displayName ?? "Select Member"}
          </ListItem>
        </Host>

        <View style={styles.amountSection}>
          <Host
            matchContents={{ vertical: true, horizontal: false }}
            style={styles.amountHost}
          >
            <Text
              textStyle={{
                fontSize: 14,
                textAlign: "center",
              }}
            >
              SEK
            </Text>

            <TextInput
              autoFocus
              defaultValue=""
              onChangeText={changeAmount}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              textAlign="center"
              maxLength={12}
              style={{
                width: 260,
                height: 80,
              }}
              textStyle={{
                fontSize: 52,
                fontWeight: "600",
                textAlign: "center",
              }}
            />
          </Host>
        </View>

        <Host
          matchContents={{ vertical: true, horizontal: false }}
          style={styles.dueDateHost}
        >
          <ListItem
            trailing={
              <Switch
                value={hasDueDate}
                onValueChange={(enabled) => {
                  setHasDueDate(enabled);

                  if (enabled && dueDate < startOfToday()) {
                    setDueDate(startOfToday());
                  }
                }}
              />
            }
          >
            Add due date
          </ListItem>
        </Host>

        {hasDueDate && (
          <View style={styles.datePickerRow}>
            <Host matchContents>
              <Text
                textStyle={{
                  fontSize: 17,
                }}
              >
                Due date
              </Text>
            </Host>

            <DateTimePicker
              value={dueDate}
              mode="date"
              display="compact"
              minimumDate={startOfToday()}
              onValueChange={(_, value) => {
                setDueDate(value);
              }}
            />
          </View>
        )}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },

  directionSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  memberHost: {
    width: "100%",
    marginTop: 12,
  },

  amountSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
  },

  amountHost: {
    width: 260,
  },

  dueDateHost: {
    width: "100%",
  },

  datePickerRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
});
