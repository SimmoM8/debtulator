import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import { GlassCard, SettingsRow, StatCard } from "@/src/components/ui/Finance";
import {
    Button,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces,
typography,
} from "@/src/constants/design";
import { resetHostedDevelopmentData } from "@/src/services/developmentReset";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

export function SettingsScreen() {
  const data = useAppData();
  const auth = useAuth();

  function confirmSyncedDataReset() {
    Alert.alert(
      "Clear local data and reset sync?",
      "Deletes every hosted public data table and all local app data, then runs a clean sync. Your login, onboarding, and preferences stay intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear and sync",
          style: "destructive",
          onPress: async () => {
            try {
              await resetHostedDevelopmentData();
              await data.resetSyncedData();
              router.replace("/(tabs)");
              Alert.alert("App data reset", "Hosted and local data were cleared. You are still signed in and a clean sync is now running.");
            } catch (error) {
              Alert.alert(
                "Could not reset synced data",
                error instanceof Error ? error.message : "The hosted or local reset failed.",
              );
            }
          },
        },
      ],
    );
  }

  function confirmFullLocalReset() {
    Alert.alert(
      "Sign out and erase all local data?",
      "This removes your session, onboarding state, preferences, and every local record from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          // iOS can discard an alert presented while the previous alert is
          // still dismissing. Schedule the stronger confirmation separately.
          onPress: () => setTimeout(showFinalFullResetConfirmation, 300),
        },
      ],
    );
  }

  function showFinalFullResetConfirmation() {
    Alert.alert(
      "Final confirmation",
      "You will need to sign in and complete first-run setup again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out and erase",
          style: "destructive",
          onPress: performFullLocalReset,
        },
      ],
    );
  }

  async function performFullLocalReset() {
    let signOutError: unknown = null;
    try {
      await auth.eraseLocalSession();
    } catch (error) {
      // Local records and preferences must remain erasable when the network or
      // hosted Auth service is unavailable.
      signOutError = error;
    }

    try {
      await data.resetLocalData();
      router.replace("/first-run");
      if (signOutError) {
        Alert.alert(
          "Local data erased",
          "Local records and preferences were erased, but Supabase sign-out failed. Reconnect and sign out again before using this device.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Could not erase local data",
        error instanceof Error ? error.message : "The local database reset failed.",
      );
    }
  }

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Settings"
        showBackButton={false}
        action={<AppMenuButton />}
      />

      <GlassCard tone="lavender">
        <Text style={styles.accountLabel}>Account</Text>
        <Text style={styles.accountTitle}>
          {auth.user
            ? auth.identity.displayName || auth.identity.email || "Your profile"
            : "Local-only mode"}
        </Text>
        <Text style={styles.accountBody}>
          {auth.user
            ? `Signed in as ${auth.identity.email ?? auth.user.id}`
            : "Everything stays on this device until you decide to sign in."}
        </Text>
        <View style={styles.statsRow}>
          <StatCard
            label="Mode"
            value={auth.user ? "Cloud" : "Local"}
            subtitle="How this device is working right now"
            tone="indigo"
          />
          <StatCard
            label="Currency"
            value={data.settings.baseCurrency}
            subtitle="Your base view currency"
            tone="lavender"
          />
          <StatCard
            label="Sync"
            value={
              data.syncSummary.hasBlockingProblems ? "Needs review" : "Healthy"
            }
            subtitle={data.syncSummary.statusLabel}
            tone={data.syncSummary.hasBlockingProblems ? "amber" : "teal"}
          />
        </View>
        {auth.user ? (
          <Button title="Sign out" variant="secondary" onPress={auth.signOut} />
        ) : (
          <Button title="Sign in" onPress={() => router.push("/auth")} />
        )}
      </GlassCard>

      {__DEV__ ? (
        <>
          <SectionTitle
            title="Developer tools"
            subtitle="Development builds only. Cloud records are not deleted here."
          />
          <GlassCard tone="coral">
            <View style={styles.sectionColumn}>
              <SettingsRow
                icon="refresh-outline"
                title="Clear local data and reset sync"
                subtitle="Clear hosted and local data, stay signed in, then sync"
                value="Reset"
                onPress={confirmSyncedDataReset}
              />
              <SettingsRow
                icon="trash-outline"
                title="Sign out and erase all local data"
                subtitle="Remove identity, onboarding, preferences, and records"
                value="Erase"
                onPress={confirmFullLocalReset}
              />
            </View>
          </GlassCard>
        </>
      ) : null}

      <SectionTitle
        title="Profile & preferences"
        subtitle="The defaults you reach for most often."
      />
      <GlassCard tone="lavender">
        <View style={styles.sectionColumn}>
          <SettingsRow
            icon="person-outline"
            title="Profile"
            subtitle="Name, phone, and account identity"
            value={auth.user ? "Manage" : "Local"}
            onPress={() => router.push("/auth")}
          />
          <SettingsRow
            icon="globe-outline"
            title="Language"
            subtitle="Keep labels and prompts comfortable"
            value="English"
            onPress={() => router.push("/language")}
          />
          <SettingsRow
            icon="cash-outline"
            title="Base currency"
            subtitle="Used for estimated summaries only"
            value={data.settings.baseCurrency}
            onPress={() => router.push("/settings")}
          />
        </View>
      </GlassCard>

      <SectionTitle
        title="Notifications"
        subtitle="In-app notifications only during beta."
      />
      <GlassCard tone="lavender">
        <View style={styles.sectionColumn}>
          <SettingsRow
            icon="notifications-outline"
            title="Alerts"
            subtitle="External push/email delivery is disabled in beta"
            value="Beta only"
            onPress={() => router.push("/notifications")}
          />
          <SettingsRow
            icon="time-outline"
            title="Quiet timing"
            subtitle="Control when reminders appear"
            value="Review"
            onPress={() => router.push("/notifications")}
          />
        </View>
      </GlassCard>

      <SectionTitle
        title="Privacy & security"
        subtitle="Private by default, with shared controls when you want them."
      />
      <GlassCard tone="lavender">
        <View style={styles.sectionColumn}>
          <SettingsRow
            icon="lock-closed-outline"
            title="Privacy"
            subtitle="Shared visibility, export defaults, and safe defaults"
            value="Review"
            onPress={() => router.push("/privacy")}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Accessibility"
            subtitle="Readable layout and assistive settings"
            value="Open"
            onPress={() => router.push("/accessibility")}
          />
        </View>
      </GlassCard>

      <SectionTitle
        title="Data & sync"
        subtitle="Explain what’s safe, what’s waiting, and what needs review."
      />
      <GlassCard tone="peach">
        <View style={styles.sectionColumn}>
          <SettingsRow
            icon="sync-outline"
            title="Sync status"
            subtitle={data.syncSummary.statusLabel}
            value={data.syncSummary.hasBlockingProblems ? "Review" : "Healthy"}
            onPress={() => router.push("/sync")}
          />
          <SettingsRow
            icon="cloud-outline"
            title="Backup"
            subtitle="Stored safely on this device and ready to export"
            value="Open"
            onPress={() => router.push("/backup")}
          />
          <SettingsRow
            icon="download-outline"
            title="Export data"
            subtitle="Share or keep a copy of your ledger"
            value="Open"
            onPress={() => router.push("/export")}
          />
        </View>
      </GlassCard>

      <SectionTitle
        title="Safety"
        subtitle="Important actions stay separate and calm."
      />
      <GlassCard tone="coral">
        <Text style={styles.dangerTitle}>Sensitive actions</Text>
        <Text style={styles.dangerBody}>
          Deleting an account or comparing conflicting changes should never be
          hidden inside normal preferences.
        </Text>
        <View style={styles.buttonRow}>
          <Button
            title="Resolve conflicts"
            variant="secondary"
            onPress={() => router.push("/conflicts")}
          />
          <Button
            title="Delete account"
            variant="danger"
            onPress={() => router.push("/delete-account")}
          />
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountLabel: {
    color: palette.primary,
    fontSize: typography.size.sm,
    fontFamily: typefaces.bodyStrong,
  },
  accountTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displaySm,
    fontFamily: typefaces.displayMedium,
  },
  accountBody: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  statsRow: {
    gap: spacing.sm,
  },
  sectionColumn: {
    gap: spacing.sm,
  },
  dangerTitle: {
    color: palette.textPrimary,
    fontSize: typography.size.xxl,
    fontFamily: typefaces.displayMedium,
  },
  dangerBody: {
    color: palette.muted,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    fontFamily: typefaces.body,
  },
  buttonRow: {
    gap: spacing.sm,
  },
});
