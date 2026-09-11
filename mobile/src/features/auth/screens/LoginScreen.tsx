import { Button, TextInput } from "@expo/ui";
import { controlSize, textFieldStyle } from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/avatars/Avatar";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  componentTokens,
  NativeThemeHost,
  spacing,
  textStyles,
  useAppTheme,
} from "@/src/theme";

const RELATIONSHIP_ICON = {
  ios: "arrow.left.arrow.right",
  android: "swap_horiz",
} as const;

const PERSON_ICON = {
  ios: "person.fill",
  android: "person",
} as const;

const FIELD_MODIFIERS = [textFieldStyle("roundedBorder"), controlSize("large")];

const BUTTON_MODIFIERS = [controlSize("large")];

export function LoginScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    auth.configured &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !submitting;

  async function handleSignIn() {
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
          backgroundColor: theme.colors.heroBackground,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              paddingTop: insets.top + spacing.lg,
            },
          ]}
        >
          <View style={styles.brand}>
            <SymbolView
              name={RELATIONSHIP_ICON}
              size={22}
              tintColor={theme.colors.onHeroBackground}
            />

            <Text
              style={[
                styles.brandName,
                {
                  color: theme.colors.onHeroBackground,
                },
              ]}
            >
              Debtulator
            </Text>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.relationship}>
              <Avatar icon={PERSON_ICON} size={56} variant="onBrand" />

              <View
                style={[
                  styles.relationshipLink,
                  {
                    backgroundColor: theme.colors.onBrandSurface,
                    borderColor: theme.colors.onBrandSurfaceBorder,
                  },
                ]}
              >
                <SymbolView
                  name={RELATIONSHIP_ICON}
                  size={20}
                  tintColor={theme.colors.onHeroBackground}
                />
              </View>

              <Avatar icon={PERSON_ICON} size={56} variant="onBrand" />
            </View>

            <Text
              style={[
                styles.heroTitle,
                {
                  color: theme.colors.onHeroBackground,
                },
              ]}
            >
              Less confusion.{"\n"}More freedom.
            </Text>

            <Text
              style={[
                styles.heroSubtitle,
                {
                  color: theme.colors.onBrandMuted,
                },
              ]}
            >
              Track what you owe, what you are owed, and keep shared money
              simple.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.appBackground,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={styles.formContent}>
            <View style={styles.heading}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                Welcome back
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: theme.colors.secondaryText,
                  },
                ]}
              >
                Sign in to pick up where you left off.
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
                      void handleSignIn();
                    }}
                  />
                </NativeThemeHost>

                <View style={styles.forgotPassword}>
                  <NativeThemeHost matchContents>
                    <Button
                      label="Forgot password?"
                      variant="text"
                      disabled={submitting}
                      modifiers={BUTTON_MODIFIERS}
                      onPress={() => {
                        router.push("/(auth)/forgot-password");
                      }}
                    />
                  </NativeThemeHost>
                </View>
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

              <NativeThemeHost
                matchContents={{ vertical: true }}
                style={styles.nativeHost}
              >
                <Button
                  label={submitting ? "Signing in…" : "Sign in"}
                  disabled={!canSubmit}
                  modifiers={BUTTON_MODIFIERS}
                  style={styles.nativeButton}
                  onPress={() => {
                    void handleSignIn();
                  }}
                />
              </NativeThemeHost>

              <Text
                style={[
                  styles.accountPrompt,
                  {
                    color: theme.colors.secondaryText,
                  },
                ]}
              >
                New to Debtulator?
              </Text>

              <NativeThemeHost
                matchContents={{ vertical: true }}
                style={styles.nativeHost}
              >
                <Button
                  label="Create account"
                  variant="outlined"
                  disabled={submitting}
                  modifiers={BUTTON_MODIFIERS}
                  style={styles.nativeButton}
                  onPress={() => {
                    router.push("/(auth)/create-account");
                  }}
                />
              </NativeThemeHost>
            </View>
          </View>
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

  scrollContent: {
    flexGrow: 1,
  },

  hero: {
    flexGrow: 1,
    minHeight: 350,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  brandName: {
    ...textStyles.headline,
  },

  heroContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl,
  },

  relationship: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  relationshipLink: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
  },

  heroTitle: {
    ...textStyles.title,
    marginTop: spacing.lg,
    textAlign: "center",
  },

  heroSubtitle: {
    ...textStyles.body,
    maxWidth: 340,
    marginTop: spacing.sm,
    lineHeight: 24,
    textAlign: "center",
  },

  sheet: {
    width: "100%",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: componentTokens.surface.radius,
    borderTopRightRadius: componentTokens.surface.radius,
  },

  formContent: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  heading: {
    marginBottom: spacing.lg,
  },

  title: {
    ...textStyles.title,
  },

  subtitle: {
    ...textStyles.body,
    marginTop: spacing.xs,
  },

  form: {
    width: "100%",
    gap: spacing.md,
  },

  field: {
    width: "100%",
    gap: spacing.xs,
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

  nativeButton: {
    width: "100%",
  },

  forgotPassword: {
    alignItems: "flex-end",
  },

  error: {
    ...textStyles.caption,
    lineHeight: 18,
  },

  accountPrompt: {
    ...textStyles.caption,
    textAlign: "center",
  },
});
