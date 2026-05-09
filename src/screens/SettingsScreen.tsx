import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppMenuButton } from "@/src/components/navigation/AppMenuButton";
import { GlassCard, SettingsRow, StatCard } from "@/src/components/ui/Finance";
import {
    Button,
    LoadingState,
    PageHeader,
    Screen,
    SectionTitle,
} from "@/src/components/ui/Primitives";
import { palette, spacing, typefaces } from "@/src/constants/design";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

export function SettingsScreen() {
  const data = useAppData();
  const auth = useAuth();

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        title="Settings"
        subtitle="Calm preferences, privacy-first defaults, and clear data safety controls."
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
        subtitle="Friendly reminders without noise."
      />
      <GlassCard tone="lavender">
        <View style={styles.sectionColumn}>
          <SettingsRow
            icon="notifications-outline"
            title="Alerts"
            subtitle="Payment reminders and shared updates"
            value={data.settings.pushNotificationsEnabled ? "On" : "Off"}
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
    fontSize: 12,
    fontFamily: typefaces.bodyStrong,
  },
  accountTitle: {
    color: palette.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: typefaces.displayMedium,
  },
  accountBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 18,
    fontFamily: typefaces.displayMedium,
  },
  dangerBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typefaces.body,
  },
  buttonRow: {
    gap: spacing.sm,
  },
});
