import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { useNewDebt } from "@/src/features/debts/state/NewDebtProvider";
import { useCreateMember } from "@/src/features/members/hooks/useCreateMember";
import { textStyles, useAppTheme } from "@/src/theme";

export function NewMemberScreen() {
  const theme = useAppTheme();

  const draft = useNewDebt();

  const { createMember, isCreating } = useCreateMember();

  const inputRef = useRef<TextInput>(null);

  const [displayName, setDisplayName] = useState("");

  const normalizedName = displayName.trim();

  const canCreate = normalizedName.length > 0 && !isCreating;

  function cancel() {
    if (isCreating) {
      return;
    }

    router.back();
  }

  async function create() {
    if (!canCreate) {
      return;
    }

    try {
      const member = await createMember({
        displayName: normalizedName,
      });

      draft.setMemberId(member.id);

      router.dismissTo("/(main)/(modals)/debt/new");
    } catch (error) {
      console.error("Failed to create member", error);

      Alert.alert(
        "Couldn’t create member",
        "The member wasn’t saved. Please try again.",
      );
    }
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Cancel new member"
          disabled={isCreating}
          onPress={cancel}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        {Platform.OS === "ios" ? (
          <Stack.Toolbar.Button
            accessibilityLabel={
              isCreating ? "Creating member" : "Create member"
            }
            disabled={!canCreate}
            onPress={() => {
              void create();
            }}
          >
            {isCreating ? "Creating…" : "Create"}
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button
            icon={toolbarIcons.check}
            accessibilityLabel={
              isCreating ? "Creating member" : "Create member"
            }
            disabled={!canCreate}
            onPress={() => {
              void create();
            }}
          />
        )}
      </Stack.Toolbar>

      <KeyboardAvoidingView
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <TextInput
            ref={inputRef}
            autoFocus
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Name"
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.controlTint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={80}
            editable={!isCreating}
            onSubmitEditing={() => {
              void create();
            }}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceContainer,
                borderColor: theme.colors.outline,
              },
            ]}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    ...textStyles.body,
  },
});
