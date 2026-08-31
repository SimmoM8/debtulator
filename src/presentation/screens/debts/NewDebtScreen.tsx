import { Button, Picker, Switch } from "@expo/ui";

import {
  DatePickerDialog as AndroidDatePickerDialog,
  Text as AndroidText,
  TextButton as AndroidTextButton,
  DropdownMenu,
  DropdownMenuItem,
} from "@expo/ui/jetpack-compose";

import { DateTimePicker } from "@expo/ui/community/datetime-picker";

import { router, useFocusEffect } from "expo-router";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CURRENCIES } from "@/src/domain/finance/currencies";

import type { CurrencyCode } from "@/src/domain/models";

import { SegmentedControl } from "@/src/presentation/components/controls";

import { SelectedMemberCard } from "@/src/presentation/components/debts/SelectedMemberCard";

import {
  type NewDebtDirection,
  useNewDebtDraft,
} from "@/src/presentation/providers/NewDebtDraftProvider";

import { useNewDebtFlow } from "@/src/presentation/providers/NewDebtFlowProvider";

import { NativeThemeHost, textStyles, useAppTheme } from "@/src/theme";

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

const LATEST_ALLOWED_DUE_DATE = new Date(2100, 11, 31, 23, 59, 59);

export function NewDebtScreen() {
  const draft = useNewDebtDraft();

  const flow = useNewDebtFlow();

  const theme = useAppTheme();

  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const titleInputRef = useRef<TextInput>(null);

  const amountInputRef = useRef<TextInput>(null);

  const hasFocusedOnceRef = useRef(false);

  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);

  const [showAndroidCurrencyMenu, setShowAndroidCurrencyMenu] = useState(false);

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

    setShowAndroidCurrencyMenu(false);

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

    setShowAndroidDatePicker(false);

    focusAmount();
  }

  function dismissAndroidDatePicker() {
    setShowAndroidDatePicker(false);

    focusAmount();
  }

  function changeMember() {
    if (flow.isCreating) {
      return;
    }

    router.push({
      pathname: "/(modals)/debt/select-member",

      params: {
        from: "new-debt",
      },
    });
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      <View style={styles.content}>
        <SegmentedControl
          value={draft.direction}
          options={DIRECTION_OPTIONS}
          onChange={changeDirection}
        />

        <View style={styles.memberSection}>
          <SelectedMemberCard
            memberName={flow.selectedMember?.displayName ?? "Select Member"}
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
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.controlTint}
            maxLength={80}
            editable={!flow.isCreating}
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
              placeholderTextColor={theme.colors.placeholder}
              selectionColor={theme.colors.controlTint}
              maxLength={12}
              editable={!flow.isCreating}
              style={styles.amountInput}
            />

            <View style={styles.currencyControl}>
              {Platform.OS === "android" ? (
                <AndroidCurrencySelector
                  value={draft.currency}
                  expanded={showAndroidCurrencyMenu}
                  onExpandedChange={setShowAndroidCurrencyMenu}
                  onChange={changeCurrency}
                />
              ) : (
                <NativeThemeHost matchContents>
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
                </NativeThemeHost>
              )}
            </View>
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
                    accentColor={theme.colors.controlTint}
                    themeVariant={theme.scheme}
                    onValueChange={(_, value) => {
                      changeDate(value);
                    }}
                  />
                ) : (
                  <NativeThemeHost matchContents>
                    <Button
                      variant="text"
                      label={formatDate(draft.dueDate)}
                      onPress={() => {
                        setShowAndroidDatePicker(true);
                      }}
                    />
                  </NativeThemeHost>
                )}
              </View>
            )}

            <NativeThemeHost matchContents style={styles.switchHost}>
              <Switch value={draft.hasDueDate} onValueChange={toggleDueDate} />
            </NativeThemeHost>
          </View>
        </View>
      </View>

      {Platform.OS === "android" && showAndroidDatePicker && (
        <NativeThemeHost matchContents>
          <AndroidDatePickerDialog
            initialDate={draft.dueDate.toISOString()}
            selectableDates={{
              start: startOfToday(),

              end: LATEST_ALLOWED_DUE_DATE,
            }}
            color={theme.colors.controlTint}
            onDateSelected={changeDate}
            onDismissRequest={dismissAndroidDatePicker}
          />
        </NativeThemeHost>
      )}
    </KeyboardAvoidingView>
  );
}

type AndroidCurrencySelectorProps = {
  value: CurrencyCode;

  expanded: boolean;

  onExpandedChange: (expanded: boolean) => void;

  onChange: (currency: CurrencyCode) => void;
};

function AndroidCurrencySelector({
  value,
  expanded,
  onExpandedChange,
  onChange,
}: AndroidCurrencySelectorProps) {
  const theme = useAppTheme();

  return (
    <NativeThemeHost matchContents style={stylesStatic.androidCurrencyHost}>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => {
          onExpandedChange(false);
        }}
      >
        <DropdownMenu.Trigger>
          <AndroidTextButton
            colors={{
              contentColor: theme.colors.controlTint,
            }}
            onClick={() => {
              onExpandedChange(true);
            }}
          >
            <AndroidText>{value}</AndroidText>
          </AndroidTextButton>
        </DropdownMenu.Trigger>

        <DropdownMenu.Items>
          {CURRENCIES.map((currency) => (
            <DropdownMenuItem
              key={currency}
              onClick={() => {
                onChange(currency);
              }}
            >
              <DropdownMenuItem.Text>
                <AndroidText>{currency}</AndroidText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </NativeThemeHost>
  );
}

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",

    month: "short",

    year: "numeric",
  }).format(date);
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
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

      color: colors.text,

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

      color: colors.text,

      textAlign: "right",

      textAlignVertical: "center",
    },

    currencyControl: {
      marginLeft: 8,

      alignItems: "flex-start",

      justifyContent: "center",
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

      color: colors.text,
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
}

const stylesStatic = StyleSheet.create({
  androidCurrencyHost: {
    alignSelf: "flex-start",
  },
});
