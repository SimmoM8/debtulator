import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
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
  getCreateAccountErrorMessage,
  getResendConfirmationErrorMessage,
} from "@/src/features/auth/utils/authErrorMessages";
import { useCurrencyCatalogue } from "@/src/features/currencies/hooks/useCurrencyCatalogue";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

const USERNAME_PATTERN = /^[a-z0-9_]{3,40}$/;
const E164_PHONE_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export function CreateAccountScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const currencies = useCurrencyCatalogue();
  const usernameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const enabledCurrencies = useMemo(
    () => currencies.data.filter((currency) => currency.enabled),
    [currencies.data],
  );

  const canSubmit =
    auth.configured &&
    name.trim().length > 0 &&
    USERNAME_PATTERN.test(username.trim().toLowerCase()) &&
    baseCurrency.length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    !submitting;

  async function createAccount() {
    if (submitting) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPhoneNumber = phoneNumber.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      setError("Enter your name.");
      return;
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError(
        "Username must use 3–40 lowercase letters, numbers, or underscores.",
      );
      return;
    }

    if (
      normalizedPhoneNumber &&
      !E164_PHONE_PATTERN.test(normalizedPhoneNumber)
    ) {
      setError("Use an international phone number such as +46701234567.");
      return;
    }

    if (!enabledCurrencies.some((currency) => currency.code === baseCurrency)) {
      setError("Select a supported base currency.");
      return;
    }

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
        name: normalizedName,
        username: normalizedUsername,
        phoneNumber: normalizedPhoneNumber || null,
        baseCurrency,
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

        <Text style={[styles.message, { color: theme.colors.secondaryText }]}>
          Create an account to keep shared money clear and organised.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Name
            </Text>

            <AppTextInput
              value={name}
              placeholder="Your name"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              blurOnSubmit={false}
              maxLength={120}
              editable={!submitting}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                usernameInputRef.current?.focus();
              }}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Username
            </Text>

            <AppTextInput
              ref={usernameInputRef}
              value={username}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
              returnKeyType="next"
              blurOnSubmit={false}
              maxLength={40}
              editable={!submitting}
              onChangeText={(value) => {
                setUsername(value.toLowerCase());
                setError(null);
              }}
              onSubmitEditing={() => {
                phoneInputRef.current?.focus();
              }}
            />

            <Text
              style={[styles.helper, { color: theme.colors.secondaryText }]}
            >
              Your unique Debtulator identifier. Use letters, numbers, and
              underscores.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Phone (optional)
            </Text>

            <AppTextInput
              ref={phoneInputRef}
              value={phoneNumber}
              placeholder="+46701234567"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="tel"
              textContentType="telephoneNumber"
              keyboardType="phone-pad"
              returnKeyType="next"
              blurOnSubmit={false}
              maxLength={32}
              editable={!submitting}
              onChangeText={(value) => {
                setPhoneNumber(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                emailInputRef.current?.focus();
              }}
            />

            <Text
              style={[styles.helper, { color: theme.colors.secondaryText }]}
            >
              Use international E.164 format if you add a phone number.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Base currency
            </Text>

            <View style={styles.currencyOptions}>
              {enabledCurrencies.map((currency) => {
                const selected = currency.code === baseCurrency;

                return (
                  <Pressable
                    key={currency.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={submitting}
                    onPress={() => {
                      setBaseCurrency(currency.code);
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.currencyOption,
                      {
                        backgroundColor: selected
                          ? theme.colors.controlContainer
                          : theme.colors.appBackground,
                        borderColor: selected
                          ? theme.colors.controlTint
                          : theme.colors.outline,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyCode,
                        {
                          color: selected
                            ? theme.colors.onControlContainer
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {currency.code}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.currencyName,
                        {
                          color: selected
                            ? theme.colors.onControlContainer
                            : theme.colors.secondaryText,
                        },
                      ]}
                    >
                      {currency.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {currencies.loading ? (
              <Text
                style={[styles.helper, { color: theme.colors.secondaryText }]}
              >
                Loading currencies…
              </Text>
            ) : null}

            {currencies.error ? (
              <Text style={[styles.helper, { color: theme.colors.negative }]}>
                Couldn’t load the local currency catalogue.
              </Text>
            ) : null}

            <Text
              style={[styles.helper, { color: theme.colors.secondaryText }]}
            >
              Summaries use this currency. Individual debts keep their original
              currency.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Email
            </Text>

            <AppTextInput
              ref={emailInputRef}
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
            <Text style={[styles.label, { color: theme.colors.text }]}>
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
            <Text style={[styles.label, { color: theme.colors.text }]}>
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

          <Text
            style={[
              styles.discoveryNotice,
              { color: theme.colors.secondaryText },
            ]}
          >
            Debtulator uses your username, name, and exact contact identifiers
            for user discovery and member linking.
          </Text>

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
  helper: {
    ...textStyles.caption,
    lineHeight: 18,
  },
  currencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  currencyOption: {
    minWidth: 112,
    flexGrow: 1,
    flexBasis: "30%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencyCode: {
    ...textStyles.headline,
  },
  currencyName: {
    ...textStyles.caption,
    marginTop: 2,
  },
  discoveryNotice: {
    ...textStyles.caption,
    lineHeight: 18,
  },
  error: {
    ...textStyles.caption,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.65,
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
