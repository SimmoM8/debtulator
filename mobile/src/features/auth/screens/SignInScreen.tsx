import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton, AppTextInput } from "@/src/components/controls";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  getResendConfirmationErrorMessage,
  getSignInErrorMessage,
  isEmailConfirmationRequired,
} from "@/src/features/auth/utils/authErrorMessages";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function SignInScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit =
    auth.configured &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !submitting &&
    !resending;

  async function signIn() {
    if (submitting || resending) {
      return;
    }

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    if (!auth.configured) {
      setError("Authentication is not available in this build.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setConfirmationRequired(false);
    setError(null);
    setNotice(null);

    try {
      await auth.signIn({
        email: normalizedEmail,
        password,
      });
    } catch (error) {
      setConfirmationRequired(isEmailConfirmationRequired(error));
      setError(getSignInErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail) || resending || submitting) {
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      await auth.resendConfirmation({ email: normalizedEmail });
      setNotice("A new confirmation email has been sent.");
    } catch (error) {
      setError(getResendConfirmationErrorMessage(error));
    } finally {
      setResending(false);
    }
  }

  function clearFeedback() {
    setConfirmationRequired(false);
    setError(null);
    setNotice(null);
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
          Welcome back. Sign in to continue to Debtulator.
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
              editable={!submitting && !resending}
              onChangeText={(value) => {
                setEmail(value);
                clearFeedback();
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
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              maxLength={128}
              editable={!submitting && !resending}
              onChangeText={(value) => {
                setPassword(value);
                clearFeedback();
              }}
              onSubmitEditing={() => {
                void signIn();
              }}
            />

            <Pressable
              accessibilityRole="button"
              disabled={submitting || resending}
              onPress={() => {
                router.push("/(auth)/forgot-password");
              }}
              style={({ pressed }) => [
                styles.textAction,
                pressed && styles.textActionPressed,
              ]}
            >
              <Text
                style={[
                  styles.textActionLabel,
                  {
                    color: theme.colors.controlTint,
                  },
                ]}
              >
                Forgot password?
              </Text>
            </Pressable>
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

          {notice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.notice, { color: theme.colors.positive }]}
            >
              {notice}
            </Text>
          ) : null}

          {confirmationRequired ? (
            <Pressable
              accessibilityRole="button"
              disabled={resending || submitting}
              onPress={() => {
                void resendConfirmation();
              }}
              style={({ pressed }) => [
                styles.resendAction,
                pressed && styles.textActionPressed,
              ]}
            >
              <Text
                style={[
                  styles.resendActionLabel,
                  { color: theme.colors.controlTint },
                ]}
              >
                {resending ? "Sending…" : "Resend confirmation email"}
              </Text>
            </Pressable>
          ) : null}

          <AppButton
            label="Sign in"
            loading={submitting}
            disabled={!canSubmit}
            onPress={() => {
              void signIn();
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
    height: 180,
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
  textAction: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
  },
  textActionLabel: {
    ...textStyles.caption,
    fontWeight: textStyles.headline.fontWeight,
  },
  resendAction: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  resendActionLabel: {
    ...textStyles.caption,
    fontWeight: textStyles.headline.fontWeight,
  },
  textActionPressed: {
    opacity: 0.6,
  },
  error: {
    ...textStyles.caption,
    lineHeight: 18,
  },
  notice: {
    ...textStyles.caption,
    lineHeight: 18,
  },
});
