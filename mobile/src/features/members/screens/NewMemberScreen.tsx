import { Stack } from "expo-router";
import { useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { useNewMember } from "@/src/features/members/state/NewMemberProvider";
import { textStyles, useAppTheme } from "@/src/theme";

export function NewMemberScreen() {
  const theme = useAppTheme();

  const draft = useNewMember();

  const inputRef = useRef<TextInput>(null);

  async function create() {
    if (!draft.canCreate) {
      return;
    }

    try {
      await draft.create();
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
          disabled={draft.isCreating}
          onPress={draft.cancel}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        {Platform.OS === "ios" ? (
          <Stack.Toolbar.Button
            accessibilityLabel={
              draft.isCreating ? "Creating member" : "Create member"
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
              draft.isCreating ? "Creating member" : "Create member"
            }
            disabled={!draft.canCreate}
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
            value={draft.displayName}
            onChangeText={draft.setDisplayName}
            placeholder="Name"
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.controlTint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={80}
            editable={!draft.isCreating}
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
