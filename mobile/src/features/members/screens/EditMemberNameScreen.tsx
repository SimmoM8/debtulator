import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppTextInput } from "@/src/components/controls";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { useMember } from "@/src/features/members/hooks/useMember";
import { renameMember } from "@/src/features/members/operations/renameMember";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function EditMemberNameScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = typeof params.memberId === "string" ? params.memberId : null;
  const member = useMember(memberId);
  const initializedMemberId = useRef<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member.data && initializedMemberId.current !== member.data.id) {
      setDisplayName(member.data.displayName);
      initializedMemberId.current = member.data.id;
    }
  }, [member.data]);

  const normalizedName = displayName.trim();
  const canSave =
    !isSaving &&
    !!member.data &&
    normalizedName.length > 0 &&
    normalizedName !== member.data.displayName;

  async function save() {
    if (!canSave || !member.data) {
      return;
    }

    setIsSaving(true);

    try {
      await renameMember(member.data, normalizedName);
      router.dismiss();
    } catch (error) {
      console.error("Failed to rename member", error);
      Alert.alert(
        "Couldn’t save display name",
        "The name wasn’t saved. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Cancel editing display name"
          disabled={isSaving}
          onPress={() => router.dismiss()}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        {Platform.OS === "ios" ? (
          <Stack.Toolbar.Button
            accessibilityLabel={isSaving ? "Saving display name" : "Save display name"}
            disabled={!canSave}
            onPress={() => {
              void save();
            }}
          >
            {isSaving ? "Saving…" : "Save"}
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button
            icon={toolbarIcons.check}
            accessibilityLabel={isSaving ? "Saving display name" : "Save display name"}
            disabled={!canSave}
            onPress={() => {
              void save();
            }}
          />
        )}
      </Stack.Toolbar>

      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.colors.appBackground }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          {member.data ? (
            <>
              <AppTextInput
                autoFocus
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={120}
                editable={!isSaving}
                onSubmitEditing={() => {
                  void save();
                }}
              />
              <Text style={[styles.helperText, { color: theme.colors.secondaryText }]}>
                Only you can see this name, even for linked members.
              </Text>
            </>
          ) : (
            <Text style={[styles.message, { color: theme.colors.secondaryText }]}>
              {member.loading ? "Loading member…" : "Couldn’t load member."}
            </Text>
          )}
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
  helperText: {
    ...textStyles.caption,
    marginTop: spacing.sm,
  },
  message: {
    ...textStyles.body,
  },
});
