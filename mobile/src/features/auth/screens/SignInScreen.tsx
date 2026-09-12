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
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function SignInScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    auth.configured &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !submitting;

  async function signIn() {
    if (submitting) {
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
    setError(null);

    try {
      await auth.signIn({
        email: normalizedEmail,
        password,
      });
    } catch (error) {
      setError(getLoginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
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
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              editable={!submitting}
              onChangeText={(value) => {
                setPassword(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                void signIn();
              }}
            />

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => {
                router.push("/(auth)/forgot-password");
              }}
              style={({ pressed }) => [
                styles.textAction,
                pressed && !submitting && styles.textActionPressed,
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

function getLoginErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Unable to sign in right now. Please try again.";
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
    code === "invalid_credentials" ||
    code === "auth_invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Incorrect email or password.";
  }

  if (code === "email_not_confirmed" || code === "auth_email_not_confirmed") {
    return "Confirm your email address before signing in.";
  }

  if (
    candidate.status === 429 ||
    code === "auth_rate_limited" ||
    code.includes("rate_limit")
  ) {
    return "Too many sign-in attempts. Try again in a little while.";
  }

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  ) {
    return "Couldn’t reach Debtulator. Check your connection and try again.";
  }

  return "Unable to sign in right now. Please try again.";
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

  textActionPressed: {
    opacity: 0.6,
  },

  error: {
    ...textStyles.caption,
    lineHeight: 18,
  },
});
