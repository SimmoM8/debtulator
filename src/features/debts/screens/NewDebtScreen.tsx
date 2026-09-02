import { Button, Picker, Switch } from "@expo/ui";

import { DateTimePicker } from "@expo/ui/community/datetime-picker";

import {
  DatePickerDialog as AndroidDatePickerDialog,
  Text as AndroidText,
  TextButton as AndroidTextButton,
  DropdownMenu,
  DropdownMenuItem,
} from "@expo/ui/jetpack-compose";

import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SegmentedControl } from "@/src/components/controls";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";

import { SelectedMemberCard } from "@/src/features/debts/components/SelectedMemberCard";
import type { DebtDirection } from "@/src/features/debts/model/Debt";
import { useNewDebt } from "@/src/features/debts/state/NewDebtProvider";

import { useMembers } from "@/src/features/members/hooks/useMembers";
import { formatDate, startOfToday } from "@/src/lib/dates";

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
] as const satisfies readonly {
  value: DebtDirection;
  label: string;
}[];

const LATEST_ALLOWED_DUE_DATE = new Date(
  Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
); // Five years from now

export type Currency = "SEK";

export function NewDebtScreen() {
  const theme = useAppTheme();

  const draft = useNewDebt();
  const { setMemberId } = draft;

  const members = useMembers();

  const { memberId: initialMemberId } = useLocalSearchParams<{
    memberId?: string;
  }>();

  const selectedMember = useMemo(
    () => members.data.find((member) => member.id === draft.memberId) ?? null,
    [draft.memberId, members.data],
  );

  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const titleInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);

  const hasFocusedOnceRef = useRef(false);
  const hasAppliedInitialMemberRef = useRef(false);

  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);

  const [showAndroidCurrencyMenu, setShowAndroidCurrencyMenu] = useState(false);

  useEffect(() => {
    if (hasAppliedInitialMemberRef.current) {
      return;
    }

    hasAppliedInitialMemberRef.current = true;

    if (typeof initialMemberId === "string" && initialMemberId.length > 0) {
      setMemberId(initialMemberId);
    }
  }, [initialMemberId, setMemberId]);

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

      return () => cancelAnimationFrame(frame);
    }, []),
  );

  function focusAmount() {
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
  }

  function changeDirection(value: DebtDirection) {
    draft.setDirection(value);
    focusAmount();
  }

  function changeAmount(candidate: string) {
    const normalized = candidate.replace(",", ".");

    if (/^\d*(\.\d{0,2})?$/.test(normalized)) {
      draft.setAmount(normalized);
    }
  }

  function changeCurrency(value: Currency) {
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
    if (draft.isCreating) {
      return;
    }

    router.push({
      pathname: "/(main)/(modals)/debt/select-member",
      params: {
        from: "new-debt",
      },
    });
  }

  function cancel() {
    if (draft.isCreating) {
      return;
    }

    draft.reset();
    router.dismiss();
  }

  async function create() {
    if (!draft.canCreate) {
      return;
    }

    try {
      await draft.create();

      draft.reset();

      router.dismiss();
    } catch (error) {
      console.error("Failed to create debt", error);

      Alert.alert(
        "Couldn’t create debt",
        "Your debt wasn’t saved. Your entered details have been kept so you can try again.",
      );
    }
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Cancel new debt"
          disabled={draft.isCreating}
          onPress={cancel}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        {Platform.OS === "ios" ? (
          <Stack.Toolbar.Button
            accessibilityLabel={
              draft.isCreating ? "Creating debt" : "Create debt"
            }
            disabled={!draft.canCreate}
            onPress={() => {
              void create();
            }}
          >
            {draft.isCreating ? "Creating…" : "Create"}
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button
            icon={toolbarIcons.check}
            accessibilityLabel={
              draft.isCreating ? "Creating debt" : "Create debt"
            }
            disabled={!draft.canCreate}
            onPress={() => {
              void create();
            }}
          />
        )}
      </Stack.Toolbar>

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
              placeholderTextColor={theme.colors.placeholder}
              selectionColor={theme.colors.controlTint}
              maxLength={80}
              editable={!draft.isCreating}
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
                editable={!draft.isCreating}
                style={styles.amountInput}
              />

              <View style={styles.currencyControl}>
                {Platform.OS === "android" ? (
                  <AndroidCurrencySelector
                    value={draft.currency as Currency}
                    expanded={showAndroidCurrencyMenu}
                    onExpandedChange={setShowAndroidCurrencyMenu}
                    onChange={changeCurrency}
                  />
                ) : (
                  <NativeThemeHost matchContents>
                    <Picker
                      selectedValue={draft.currency}
                      onValueChange={(value) => {
                        changeCurrency(value as Currency);
                      }}
                    >
                      <Picker.Item key="SEK" label="SEK" value="SEK" />
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
                <Switch
                  value={draft.hasDueDate}
                  onValueChange={toggleDueDate}
                />
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
    </>
  );
}

type AndroidCurrencySelectorProps = {
  value: Currency;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onChange: (currency: Currency) => void;
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
          <DropdownMenuItem
            key="SEK"
            onClick={() => {
              onChange("SEK");
            }}
          >
            <DropdownMenuItem.Text>
              <AndroidText>SEK</AndroidText>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </NativeThemeHost>
  );
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
