import { router } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton, AppTextInput } from "@/src/components/controls";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const auth = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = auth.configured && email.trim().length > 0 && !submitting;

  async function sendResetLink() {
    if (submitting) {
      return;
    }

    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!auth.configured) {
      setError("Authentication is not available in this build.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    try {
      await auth.requestPasswordReset({
        email: normalizedEmail,
      });

      setSent(true);
    } catch (error) {
      setError(getRecoveryErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
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
          <Text
            style={[
              styles.confirmationTitle,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Check your email
          </Text>

          <Text
            style={[
              styles.confirmationMessage,
              {
                color: theme.colors.secondaryText,
              },
            ]}
          >
            If an account exists for that email, a password reset link has been
            sent.
          </Text>

          <View style={styles.confirmationAction}>
            <AppButton
              label="Back to sign in"
              onPress={() => {
                router.back();
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
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.secondaryText,
            },
          ]}
        >
          Enter your email and we’ll send you a reset link.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              Email
            </Text>

            <AppTextInput
              value={email}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="send"
              editable={!submitting}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                void sendResetLink();
              }}
            />
          </View>

          {error ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[
                styles.error,
                {
                  color: theme.colors.negative,
                },
              ]}
            >
              {error}
            </Text>
          ) : null}

          <AppButton
            label="Send reset link"
            loading={submitting}
            disabled={!canSubmit}
            onPress={() => {
              void sendResetLink();
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRecoveryErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Unable to send a reset link right now. Please try again.";
  }

  const candidate = error as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };

  const code =
    typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";

  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLowerCase()
      : "";

  if (candidate.status === 429 || code.includes("rate_limit")) {
    return "Too many attempts. Try again in a little while.";
  }

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to send a reset link right now. Please try again.";
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
