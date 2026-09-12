import { Stack } from "expo-router";
import { useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type TextInput,
  View,
} from "react-native";

import { AppTextInput } from "@/src/components/controls";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { useNewMember } from "@/src/features/members/state/NewMemberProvider";
import { spacing, useAppTheme } from "@/src/theme";

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
          <AppTextInput
            ref={inputRef}
            autoFocus
            value={draft.displayName}
            onChangeText={draft.setDisplayName}
            placeholder="Name"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={80}
            editable={!draft.isCreating}
            onSubmitEditing={() => {
              void create();
            }}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
