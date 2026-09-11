import { TextInput } from "@expo/ui";
import {
  controlSize,
  textFieldStyle,
} from "@expo/ui/swift-ui/modifiers";
import { router, Stack } from "expo-router";
import type { ReactNode } from "react";
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

export function CreateAccountScreen() {
  const theme = useAppTheme();
  const auth = useAuth();

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
      <>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={toolbarIcons.close}
            accessibilityLabel="Close create account"
            onPress={() => {
              router.dismiss();
            }}
          />
        </Stack.Toolbar>

        <View
          style={[
            styles.confirmation,
            {
              backgroundColor: theme.colors.appBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.heading,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Check your email
          </Text>

          <Text
            style={[
              styles.message,
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
                router.dismiss();
              }}
            />
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Close create account"
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
            Create your account
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: theme.colors.secondaryText,
              },
            ]}
          >
            Start keeping shared money clear and organised.
          </Text>

          <View style={styles.form}>
            <AuthField label="Email">
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
            </AuthField>

            <AuthField label="Password">
              <NativeThemeHost
                matchContents={{ vertical: true }}
                style={styles.nativeHost}
              >
                <TextInput
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!submitting}
                  modifiers={FIELD_MODIFIERS}
                  style={styles.nativeInput}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError(null);
                  }}
                />
              </NativeThemeHost>
            </AuthField>

            <AuthField label="Confirm password">
              <NativeThemeHost
                matchContents={{ vertical: true }}
                style={styles.nativeHost}
              >
                <TextInput
                  placeholder="Confirm password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  returnKeyType="done"
                  editable={!submitting}
                  modifiers={FIELD_MODIFIERS}
                  style={styles.nativeInput}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setError(null);
                  }}
                  onSubmitEditing={() => {
                    void createAccount();
                  }}
                />
              </NativeThemeHost>
            </AuthField>

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
    </>
  );
}

type AuthFieldProps = {
  label: string;
  children: ReactNode;
};

function AuthField({ label, children }: AuthFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.text,
          },
        ]}
      >
        {label}
      </Text>

      {children}
    </View>
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

  if (
    code.includes("password") ||
    message.includes("password")
  ) {
    return "Choose a stronger password and try again.";
  }

  if (
    candidate.status === 429 ||
    code.includes("rate_limit")
  ) {
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

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },

  confirmation: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  confirmationAction: {
    marginTop: spacing.xl,
  },

  heading: {
    ...textStyles.title,
  },

  message: {
    ...textStyles.body,
    marginTop: spacing.sm,
    lineHeight: 24,
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

  error: {
    ...textStyles.caption,
    lineHeight: 18,
  },
});
