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
import {
  getCreateAccountErrorMessage,
  getResendConfirmationErrorMessage,
} from "@/src/features/auth/utils/authErrorMessages";
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
  const [resending, setResending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit =
    auth.configured &&
    email.trim().length > 0 &&
    password.length >= 8 &&
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
    setNotice(null);

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

  async function resendConfirmation() {
    if (resending) {
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      await auth.resendConfirmation({ email: email.trim() });
      setNotice("A new confirmation email has been sent.");
    } catch (error) {
      setError(getResendConfirmationErrorMessage(error));
    } finally {
      setResending(false);
    }
  }

  if (verificationSent) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.colors.appBackground }}
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
          We sent a confirmation link to {email.trim()}. Open it on this device
          to finish creating your account.
        </Text>

        {error ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.centeredError, { color: theme.colors.negative }]}
          >
            {error}
          </Text>
        ) : null}

        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.centeredNotice, { color: theme.colors.positive }]}
          >
            {notice}
          </Text>
        ) : null}

        <View style={styles.confirmationActions}>
          <AppButton
            label="Resend confirmation"
            variant="secondary"
            loading={resending}
            disabled={resending}
            onPress={() => {
              void resendConfirmation();
            }}
          />

          <AppButton
            label="Back to sign in"
            onPress={() => {
              router.replace("/(auth)/sign-in");
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
            <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>

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
              maxLength={320}
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
            <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>

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
                void createAccount();
              }}
            />
          </View>

          {!auth.configured && !error ? (
            <Text
              accessibilityRole="alert"
              style={[styles.error, { color: theme.colors.negative }]}
            >
              Authentication is not available in this build.
            </Text>
          ) : null}

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
  confirmationActions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  centeredError: {
    ...textStyles.caption,
    marginTop: spacing.md,
    lineHeight: 18,
    textAlign: "center",
  },
  centeredNotice: {
    ...textStyles.caption,
    marginTop: spacing.md,
    lineHeight: 18,
    textAlign: "center",
  },
});
