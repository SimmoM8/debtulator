import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/src/components/controls";
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  getEmailConfirmationErrorMessage,
  isRetryableAuthError,
} from "@/src/features/auth/utils/authErrorMessages";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

export function EmailConfirmationScreen() {
  const theme = useAppTheme();
  const auth = useAuth();
  const params = useLocalSearchParams<{
    token_hash?: string | string[];
    tokenHash?: string | string[];
  }>();

  const startedRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const tokenHash = firstString(params.token_hash) ?? firstString(params.tokenHash);

  const confirm = useCallback(async () => {
    if (!tokenHash || confirming) {
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      await auth.confirmEmail({ tokenHash });
    } catch (error) {
      setError(error);
    } finally {
      setConfirming(false);
    }
  }, [auth, confirming, tokenHash]);

  useEffect(() => {
    if (startedRef.current || !tokenHash) {
      return;
    }

    startedRef.current = true;
    void confirm();
  }, [confirm, tokenHash]);

  const message = tokenHash
    ? error
      ? getEmailConfirmationErrorMessage(error)
      : "Confirming your email…"
    : "This confirmation link is incomplete or invalid.";

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.appBackground,
        },
      ]}
    >
      <View style={styles.content}>
        {confirming || (!error && tokenHash) ? (
          <ActivityIndicator color={theme.colors.controlTint} />
        ) : null}

        <Text style={[styles.title, { color: theme.colors.text }]}>Confirm email</Text>

        <Text
          accessibilityRole={error || !tokenHash ? "alert" : undefined}
          accessibilityLiveRegion="polite"
          style={[
            styles.message,
            {
              color: error || !tokenHash
                ? theme.colors.negative
                : theme.colors.secondaryText,
            },
          ]}
        >
          {message}
        </Text>

        {error && isRetryableAuthError(error) ? (
          <View style={styles.action}>
            <AppButton
              label="Try again"
              loading={confirming}
              onPress={() => {
                void confirm();
              }}
            />
          </View>
        ) : null}

        {error || !tokenHash ? (
          <View style={styles.action}>
            <AppButton
              label="Back to sign in"
              variant={isRetryableAuthError(error) ? "secondary" : "primary"}
              onPress={() => {
                router.replace("/(auth)/sign-in");
              }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function firstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim() || null;
  }

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...textStyles.title,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  message: {
    ...textStyles.body,
    maxWidth: 420,
    marginTop: spacing.sm,
    lineHeight: 24,
    textAlign: "center",
  },
  action: {
    width: "100%",
    maxWidth: 480,
    marginTop: spacing.lg,
  },
});
