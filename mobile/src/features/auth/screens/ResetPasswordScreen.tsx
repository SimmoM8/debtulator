import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton, AppTextInput } from "@/src/components/controls";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { getPasswordResetErrorMessage } from "@/src/features/auth/utils/authErrorMessages";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function ResetPasswordScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const params = useLocalSearchParams<{
    token_hash?: string | string[];
    tokenHash?: string | string[];
  }>();
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const tokenHash = firstString(params.token_hash) ?? firstString(params.tokenHash);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    auth.configured &&
    tokenHash !== null &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    !submitting;

  async function resetPassword() {
    if (!tokenHash || submitting) {
      return;
    }

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    try {
      await auth.resetPassword({
        tokenHash,
        newPassword: password,
      });
      setComplete(true);
    } catch (error) {
      setError(getPasswordResetErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (complete) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        <View style={styles.confirmation}>
          <Text style={[styles.confirmationTitle, { color: theme.colors.text }]}>Password updated</Text>

          <Text
            style={[
              styles.confirmationMessage,
              {
                color: theme.colors.secondaryText,
              },
            ]}
          >
            Your password has been changed. Sign in again with your new password.
          </Text>

          <View style={styles.confirmationAction}>
            <AppButton
              label="Sign in"
              onPress={() => {
                router.replace("/(auth)/sign-in");
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (!tokenHash) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        <View style={styles.confirmation}>
          <Text style={[styles.confirmationTitle, { color: theme.colors.text }]}>Invalid reset link</Text>

          <Text
            accessibilityRole="alert"
            style={[
              styles.confirmationMessage,
              {
                color: theme.colors.secondaryText,
              },
            ]}
          >
            This password reset link is incomplete or invalid. Request a new one and try again.
          </Text>

          <View style={styles.confirmationAction}>
            <AppButton
              label="Request a new link"
              onPress={() => {
                router.replace("/(auth)/forgot-password");
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.appBackground,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.message, { color: theme.colors.secondaryText }]}>Choose a new password for your Debtulator account.</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>New password</Text>

            <AppTextInput
              value={password}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              blurOnSubmit={false}
              maxLength={128}
              editable={!submitting}
              onChangeText={(value) => {
                setPassword(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                confirmPasswordInputRef.current?.focus();
              }}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Confirm password</Text>

            <AppTextInput
              ref={confirmPasswordInputRef}
              value={confirmPassword}
              placeholder="Confirm password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              maxLength={128}
              editable={!submitting}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                void resetPassword();
              }}
            />
          </View>

          {error ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: theme.colors.negative }]}
            >
              {error}
            </Text>
          ) : null}

          <AppButton
            label="Update password"
            loading={submitting}
            disabled={!canSubmit}
            onPress={() => {
              void resetPassword();
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function firstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim() || null;
  }

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  message: {
    ...textStyles.body,
    lineHeight: 24,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...textStyles.caption,
    fontWeight: textStyles.headline.fontWeight,
  },
  error: {
    ...textStyles.caption,
    lineHeight: 18,
  },
  confirmation: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  confirmationTitle: {
    ...textStyles.title,
    textAlign: "center",
  },
  confirmationMessage: {
    ...textStyles.body,
    marginTop: spacing.sm,
    lineHeight: 24,
    textAlign: "center",
  },
  confirmationAction: {
    marginTop: spacing.lg,
  },
});
