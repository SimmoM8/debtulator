import { Image } from "expo-image";
import { router } from "expo-router";
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
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function CreateAccountScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    auth.configured &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !submitting;

  async function createAccount() {
    if (submitting) {
      return;
    }

    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
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

    if (!auth.configured) {
      setError("Authentication is not available in this build.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    try {
      const result = await auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (result.emailVerificationRequired) {
        setVerificationSent(true);
      }
    } catch (error) {
      setError(getCreateAccountErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (verificationSent) {
    return (
      <ScrollView
        style={{
          backgroundColor: theme.colors.appBackground,
        }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.confirmation}
      >
        <Image
          source={require("@/assets/images/debtulator_stone_flow_4096.png")}
          contentFit="contain"
          style={styles.confirmationFeature}
        />

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
          We sent a confirmation link to {email.trim()}.
        </Text>

        <View style={styles.confirmationAction}>
          <AppButton
            label="Done"
            onPress={() => {
              router.back();
            }}
          />
        </View>
      </ScrollView>
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
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Image
          source={require("@/assets/images/debtulator_stone_flow_4096.png")}
          contentFit="contain"
          contentPosition="center"
          style={styles.feature}
        />

        <Text
          style={[
            styles.message,
            {
              color: theme.colors.secondaryText,
            },
          ]}
        >
          Create an account to keep shared money clear and organised.
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
              returnKeyType="next"
              blurOnSubmit={false}
              editable={!submitting}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                passwordInputRef.current?.focus();
              }}
            />
          </View>

          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              Password
            </Text>

            <AppTextInput
              ref={passwordInputRef}
              value={password}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              blurOnSubmit={false}
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
            <Text
              style={[
                styles.label,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              Confirm password
            </Text>

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
              editable={!submitting}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                void createAccount();
              }}
            />
          </View>

          {!auth.configured && !error ? (
            <Text
              accessibilityRole="alert"
              style={[
                styles.error,
                {
                  color: theme.colors.negative,
                },
              ]}
            >
              Authentication is not available in this build.
            </Text>
          ) : null}

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
            label="Create account"
            loading={submitting}
            disabled={!canSubmit}
            onPress={() => {
              void createAccount();
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

function getCreateAccountErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Unable to create your account right now. Please try again.";
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

  if (
    code.includes("already") ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "An account already uses those credentials.";
  }

  if (code.includes("password") || message.includes("password")) {
    return "Choose a stronger password and try again.";
  }

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

  return "Unable to create your account right now. Please try again.";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  feature: {
    width: "100%",
    height: 160,
  },

  message: {
    ...textStyles.body,
    marginTop: spacing.md,
    lineHeight: 24,
    textAlign: "center",
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
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  confirmationFeature: {
    width: "100%",
    height: 180,
  },

  confirmationTitle: {
    ...textStyles.title,
    marginTop: spacing.lg,
    textAlign: "center",
  },

  confirmationMessage: {
    ...textStyles.body,
    marginTop: spacing.sm,
    lineHeight: 24,
    textAlign: "center",
  },

  confirmationAction: {
    width: "100%",
    marginTop: spacing.lg,
  },
});
