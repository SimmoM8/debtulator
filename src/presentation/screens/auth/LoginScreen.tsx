import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/presentation/providers/AuthProvider";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function LoginScreen() {
  const theme = useAppTheme();

  const auth = useAuth();

  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSignIn() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);

    setError(null);

    try {
      await auth.signIn({
        email,
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

          paddingTop: insets.top,

          paddingBottom: insets.bottom,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Debtulator
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.secondaryText,
              },
            ]}
          >
            Sign in to continue
          </Text>
        </View>

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

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!submitting}
              style={[
                styles.input,
                {
                  color: theme.colors.text,

                  backgroundColor: theme.colors.surfaceContainer,

                  borderColor: theme.colors.outline,
                },
              ]}
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

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.colors.placeholder}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              editable={!submitting}
              onSubmitEditing={() => {
                void handleSignIn();
              }}
              style={[
                styles.input,
                {
                  color: theme.colors.text,

                  backgroundColor: theme.colors.surfaceContainer,

                  borderColor: theme.colors.outline,
                },
              ]}
            />
          </View>

          {error ? (
            <Text
              accessibilityRole="alert"
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            disabled={!canSubmit}
            onPress={() => {
              void handleSignIn();
            }}
            style={({ pressed }) => [
              styles.signInButton,

              {
                backgroundColor: theme.colors.controlTint,
              },

              !canSubmit && styles.disabled,

              pressed && canSubmit && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.onHeroBackground} />
            ) : (
              <Text
                style={[
                  styles.signInButtonText,
                  {
                    color: theme.colors.onHeroBackground,
                  },
                ]}
              >
                Sign in
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials")
    ) {
      return "Incorrect email or password.";
    }
  }

  return "Unable to sign in. Please try again.";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  content: {
    flex: 1,

    justifyContent: "center",

    paddingHorizontal: spacing.lg,
  },

  heading: {
    marginBottom: spacing.xl,
  },

  title: {
    ...textStyles.largeTitle,
  },

  subtitle: {
    ...textStyles.body,

    marginTop: spacing.sm,
  },

  form: {
    gap: spacing.md,
  },

  field: {
    gap: spacing.sm,
  },

  label: {
    ...textStyles.headline,
  },

  input: {
    ...textStyles.body,

    minHeight: 52,

    paddingHorizontal: spacing.md,

    borderWidth: StyleSheet.hairlineWidth,

    borderRadius: 14,
  },

  error: {
    ...textStyles.caption,
  },

  signInButton: {
    height: 52,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 14,

    marginTop: spacing.sm,
  },

  signInButtonText: {
    ...textStyles.headline,
  },

  disabled: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.8,
  },
});
