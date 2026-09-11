import { TextInput } from "@expo/ui";
import {
  controlSize,
  textFieldStyle,
} from "@expo/ui/swift-ui/modifiers";
import { router, Stack } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/src/components/controls";
import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  NativeThemeHost,
  spacing,
  textStyles,
  useAppTheme,
} from "@/src/theme";

const FIELD_MODIFIERS = [
  textFieldStyle("roundedBorder"),
  controlSize("large"),
];

export function SignInScreen() {
  const theme = useAppTheme();
  const auth = useAuth();

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
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Close sign in"
          disabled={submitting}
          onPress={() => {
            router.dismiss();
          }}
        />
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          <Text
            style={[
              styles.heading,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Welcome back
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: theme.colors.secondaryText,
              },
            ]}
          >
            Sign in to continue to Debtulator.
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

              <NativeThemeHost
                matchContents={{ vertical: true }}
                style={styles.nativeHost}
              >
                <TextInput
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!submitting}
                  modifiers={FIELD_MODIFIERS}
                  style={styles.nativeInput}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError(null);
                  }}
                />
              </NativeThemeHost>
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

              <NativeThemeHost
                matchContents={{ vertical: true }}
                style={styles.nativeHost}
              >
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  returnKeyType="go"
                  editable={!submitting}
                  modifiers={FIELD_MODIFIERS}
                  style={styles.nativeInput}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError(null);
                  }}
                  onSubmitEditing={() => {
                    void signIn();
                  }}
                />
              </NativeThemeHost>

              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => {
                  router.push("/(auth)/(modals)/forgot-password");
                }}
                style={({ pressed }) => [
                  styles.forgotPassword,
                  pressed && styles.textActionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
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
    </>
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

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },

  heading: {
    ...textStyles.title,
  },

  message: {
    ...textStyles.body,
    marginTop: spacing.sm,
  },

  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },

  field: {
    gap: spacing.sm,
  },

  label: {
    ...textStyles.headline,
  },

  nativeHost: {
    width: "100%",
  },

  nativeInput: {
    width: "100%",
  },

  forgotPassword: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
  },

  forgotPasswordText: {
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
