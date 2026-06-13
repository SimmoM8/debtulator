import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DebtulatorOrbitIllustration } from "@/src/components/illustrations/DebtulatorOrbitIllustration";
import {
    Button,
    Card,
    PageHeader,
    Screen,
    SectionTitle,
    SegmentedControl,
    TextField,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { useAuth } from "@/src/state/AuthProvider";

type AuthMode = "signin" | "signup" | "forgot";

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        await auth.signUp({ email, password, displayName });
        setMessage(
          "Account created. Check your email if confirmation is enabled.",
        );
      } else if (mode === "forgot") {
        await auth.resetPassword(email);
        setMessage("Password reset email sent.");
      } else {
        await auth.signIn({ email, password });
        router.back();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        <Button
          title="Continue without account"
          icon="phone-portrait"
          variant="secondary"
          onPress={() => router.back()}
        />
      }
    >
      <PageHeader
        eyebrow="Account"
        title="Debtulator account"
      />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Local first</Text>
            <Text style={styles.heroTitle}>
              Choose when Debtulator becomes shared.
            </Text>
            <Text style={styles.heroBody}>
              Stay local-only for private tracking, or sign in when you want
              member links, verification, and shared group workflows.
            </Text>
          </View>
          <View style={styles.heroArtWrap}>
            <DebtulatorOrbitIllustration width={132} height={104} compact />
          </View>
        </View>
      </Card>

      <Card tone="lavender">
        <SectionTitle
          title="Authentication"
          subtitle={
            auth.configured
              ? "Supabase Auth stores the account session securely on this device."
              : "Supabase environment variables are missing, so local-only mode remains active."
          }
        />
        <SegmentedControl
          value={mode}
          options={[
            { label: "Sign in", value: "signin" },
            { label: "Sign up", value: "signup" },
            { label: "Reset", value: "forgot" },
          ]}
          onChange={setMode}
        />
        {mode === "signup" ? (
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
          />
        ) : null}
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        {mode !== "forgot" ? (
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.buttonRow}>
          <Button
            title={
              mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset email"
                  : "Sign in"
            }
            icon={
              mode === "signup"
                ? "person-add"
                : mode === "forgot"
                  ? "mail"
                  : "log-in"
            }
            onPress={submit}
            disabled={
              submitting ||
              !auth.configured ||
              !email.trim() ||
              (mode !== "forgot" && password.length < 6) ||
              (mode === "signup" && !displayName.trim())
            }
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -24,
    right: -10,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(221,214,254,0.24)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    flexWrap: "wrap",
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  heroLabel: {
    color: palette.muted,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
    fontFamily: typefaces.displayMedium,
  },
  heroBody: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xlPlus,
    fontFamily: typefaces.body,
  },
  heroArtWrap: {
    width: 142,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGlass,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: palette.negative,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.bodyStrong,
  },
  message: {
    color: palette.positive,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.bodyStrong,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});
