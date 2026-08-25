import { Button, Host, Picker, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
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
import {
  type NewDebtDirection,
  useNewDebtDraft,
} from "@/src/presentation/providers/NewDebtDraftProvider";
import { colors, textStyles } from "@/src/theme";

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
  const draft = useNewDebtDraft();

  const titleInputRef = useRef<TextInput>(null);

  const amountInputRef = useRef<TextInput>(null);

  const hasFocusedOnceRef = useRef(false);

  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);

  const selectedMember = useMemo(
    () => data.members.find((member) => member.id === draft.memberId) ?? null,
    [data.members, draft.memberId],
  );

  const parsedAmount = useMemo(() => {
    if (draft.amount.length === 0 || draft.amount === ".") {
      return 0;
    }

    const parsed = Number(draft.amount);

    return Number.isFinite(parsed) ? parsed : 0;
  }, [draft.amount]);

  const canCreate =
    selectedMember !== null &&
    draft.title.trim().length > 0 &&
    parsedAmount > 0;

  /*
   * First appearance -> title.
   *
   * Every later appearance -> amount.
   *
   * That includes:
   *
   * - Back from Select Member
   * - selecting the same member
   * - selecting a different member
   */
  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        if (!hasFocusedOnceRef.current) {
          hasFocusedOnceRef.current = true;

          titleInputRef.current?.focus();

          return;
        }

        amountInputRef.current?.focus();
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }, []),
  );

  function focusAmount() {
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
  }

  function changeDirection(value: NewDebtDirection) {
    draft.setDirection(value);

    focusAmount();
  }

  function changeAmount(candidate: string) {
    const normalized = candidate.replace(",", ".");

    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      draft.setAmount(normalized);
    }
  }

  function changeCurrency(value: CurrencyCode) {
    draft.setCurrency(value);

    focusAmount();
  }

  function toggleDueDate(enabled: boolean) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (!enabled) {
      setShowAndroidDatePicker(false);
    } else if (draft.dueDate < startOfToday()) {
      draft.setDueDate(startOfToday());
    }

    draft.setHasDueDate(enabled);

    focusAmount();
  }

  function changeDate(value: Date) {
    draft.setDueDate(value);

    if (Platform.OS === "android") {
      setShowAndroidDatePicker(false);
    }

    focusAmount();
  }

  function dismissAndroidDatePicker() {
    setShowAndroidDatePicker(false);

    focusAmount();
  }

  function createDebt() {
    if (!canCreate || !selectedMember) {
      return;
    }

    const value = {
      title: draft.title.trim(),
      direction: draft.direction,
      memberId: selectedMember.id,
      amount: parsedAmount,
      currency: draft.currency,

      dueDate: draft.hasDueDate ? toDateString(draft.dueDate) : null,
    };

    console.log("Create debt", value);

    // Application-layer command comes next.
  }

  function cancelDebtFlow() {
    draft.reset();

    router.dismissTo("/(tabs)/debts");
  }

  function changeMember() {
    router.push({
      pathname: "/(modals)/debt/select-member",

      params: {
        from: "new-debt",
      },
    });
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

      <KeyboardAvoidingView style={styles.root} behavior="height">
        <View style={styles.content}>
          <SegmentedControl
            value={draft.direction}
            options={DIRECTION_OPTIONS}
            onChange={changeDirection}
          />

          <View style={styles.memberSection}>
            <SelectedMemberCard
              memberName={selectedMember?.displayName ?? "Select Member"}
              onPress={changeMember}
            />
          </View>

          <View style={styles.titleRow}>
            <TextInput
              ref={titleInputRef}
              value={draft.title}
              onChangeText={draft.setTitle}
              onSubmitEditing={focusAmount}
              autoCapitalize="sentences"
              returnKeyType="next"
              placeholder="Debt name"
              placeholderTextColor={colors.native.secondaryText}
              selectionColor={colors.nativeControlTint}
              maxLength={80}
              style={styles.titleInput}
            />
          </View>

          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <TextInput
                ref={amountInputRef}
                value={draft.amount}
                onChangeText={changeAmount}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0"
                placeholderTextColor={colors.native.secondaryText}
                selectionColor={colors.nativeControlTint}
                maxLength={12}
                style={styles.amountInput}
              />

              <Host
                seedColor={colors.nativeControlTint}
                matchContents
                style={styles.currencyHost}
              >
                <Picker
                  selectedValue={draft.currency}
                  onValueChange={(value) => {
                    changeCurrency(value as CurrencyCode);
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

            <View style={styles.dueDateActions}>
              {draft.hasDueDate && (
                <View style={styles.dateControl}>
                  {Platform.OS === "ios" ? (
                    <DateTimePicker
                      value={draft.dueDate}
                      mode="date"
                      display="compact"
                      minimumDate={startOfToday()}
                      accentColor={colors.nativeControlTint}
                      onValueChange={(_, value) => {
                        changeDate(value);
                      }}
                    />
                  ) : (
                    <Host seedColor={colors.nativeControlTint} matchContents>
                      <Button
                        variant="text"
                        label={formatDate(draft.dueDate)}
                        onPress={() => {
                          setShowAndroidDatePicker(true);
                        }}
                      />
                    </Host>
                  )}
                </View>
              )}

              <Host
                seedColor={colors.nativeControlTint}
                matchContents
                style={styles.switchHost}
              >
                <Switch
                  value={draft.hasDueDate}
                  onValueChange={toggleDueDate}
                />
              </Host>
            </View>
          </View>
        </View>

        {Platform.OS === "android" && showAndroidDatePicker && (
          <DateTimePicker
            value={draft.dueDate}
            mode="date"
            presentation="dialog"
            minimumDate={startOfToday()}
            accentColor={colors.nativeControlTint}
            onValueChange={(_, value) => {
              changeDate(value);
            }}
            onDismiss={dismissAndroidDatePicker}
          />
        )}
      </KeyboardAvoidingView>
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
    backgroundColor: colors.appBackground,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  memberSection: {
    marginTop: 16,
  },

  titleRow: {
    height: 58,
    marginTop: 10,

    justifyContent: "center",
  },

  titleInput: {
    width: "100%",
    height: 48,

    paddingHorizontal: 0,
    paddingVertical: 0,

    ...textStyles.body,

    color: colors.native.text,

    textAlign: "center",
  },

  amountSection: {
    alignItems: "center",
    marginTop: 18,
  },

  amountRow: {
    height: 96,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  amountInput: {
    minWidth: 110,
    maxWidth: 250,
    height: 88,

    paddingHorizontal: 0,
    paddingVertical: 0,

    fontSize: 62,
    fontWeight: "400",

    color: colors.native.text,

    textAlign: "right",
    textAlignVertical: "center",
  },

  currencyHost: {
    marginLeft: 10,
  },

  dueDateRow: {
    height: 60,

    flexDirection: "row",
    alignItems: "center",

    marginTop: 4,

    paddingHorizontal: 4,
  },

  dueDateLabel: {
    flex: 1,

    ...textStyles.body,

    color: colors.native.text,
  },

  dueDateActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateControl: {
    marginRight: 10,
  },

  switchHost: {
    justifyContent: "center",
  },
});
