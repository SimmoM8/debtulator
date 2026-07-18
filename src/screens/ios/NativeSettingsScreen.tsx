import { Button, Section } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { Stack, router } from "expo-router";
import { useState } from "react";

import { NativeConfirmationDialog } from "@/src/components/ios/NativeConfirmationDialog";
import { NativeListScreen } from "@/src/components/ios/NativeListScreen";
import {
  NativeInfoRow,
  NativeNavigationRow,
} from "@/src/components/ios/NativeRows";
import { useAppData } from "@/src/state/AppDataProvider";
import { useAuth } from "@/src/state/AuthProvider";

export function NativeSettingsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [signOutPresented, setSignOutPresented] = useState(false);

  return (
    <>
      <Stack.Title large>Settings</Stack.Title>
      <NativeListScreen onRefresh={auth.refreshSync}>
        <Section title="Account">
          <NativeInfoRow
            label={auth.user ? "Signed in" : "Mode"}
            value={auth.identity.email || "Local only"}
            systemImage="person.crop.circle"
          />
          {auth.user ? (
            <Button
              label="Sign Out"
              role="destructive"
              onPress={() => setSignOutPresented(true)}
              modifiers={[buttonStyle("plain")]}
            />
          ) : (
            <NativeNavigationRow
              title="Sign In or Create Account"
              subtitle="Enable shared groups, confirmations and sync"
              systemImage="person.badge.key"
              onPress={() => router.push("/auth" as never)}
            />
          )}
        </Section>

        <Section title="Preferences">
          <NativeNavigationRow
            title="Language"
            value={data.settings.language === "system" ? "System" : data.settings.language}
            systemImage="globe"
            onPress={() => router.push("/(tabs)/settings/language" as never)}
          />
          <NativeNavigationRow
            title="Notifications"
            subtitle="Alerts, quiet hours and shared activity"
            systemImage="bell"
            onPress={() => router.push("/(tabs)/settings/notifications" as never)}
          />
          <NativeNavigationRow
            title="Privacy"
            subtitle="Control what is synced, shared and shown"
            systemImage="hand.raised"
            onPress={() => router.push("/(tabs)/settings/privacy" as never)}
          />
          <NativeNavigationRow
            title="Accessibility and Help"
            systemImage="accessibility"
            onPress={() => router.push("/(tabs)/settings/accessibility" as never)}
          />
        </Section>

        <Section title="Data">
          <NativeNavigationRow
            title="Sync Status"
            value={data.syncSummary.hasBlockingProblems ? "Needs review" : "Healthy"}
            systemImage="arrow.triangle.2.circlepath"
            onPress={() => router.push("/(tabs)/settings/sync" as never)}
          />
          <NativeNavigationRow
            title="Conflicts"
            value={String(data.syncConflicts.filter((item) => item.status === "unresolved").length)}
            systemImage="exclamationmark.arrow.triangle.2.circlepath"
            onPress={() => router.push("/(tabs)/settings/conflicts" as never)}
          />
          <NativeNavigationRow
            title="Backup and Restore"
            systemImage="externaldrive"
            onPress={() => router.push("/(tabs)/settings/backup" as never)}
          />
          <NativeNavigationRow
            title="Import and Export"
            systemImage="square.and.arrow.up.on.square"
            onPress={() => router.push("/(tabs)/settings/export" as never)}
          />
        </Section>

        <Section title="Automation">
          <NativeNavigationRow
            title="Recurring Records"
            value={String(data.recurringTemplates.filter((item) => item.status === "active").length)}
            systemImage="repeat"
            onPress={() => router.push("/(tabs)/settings/recurring" as never)}
          />
        </Section>

        <Section title="Account Safety">
          <NativeNavigationRow
            title="Delete Account"
            subtitle="Review and request permanent deletion"
            systemImage="trash"
            onPress={() => router.push("/(tabs)/settings/delete-account" as never)}
          />
        </Section>

        <NativeConfirmationDialog
          title="Sign out of Debtulator?"
          message="Your local records remain on this device. Shared changes will stop syncing until you sign in again."
          actionLabel="Sign Out"
          destructive
          isPresented={signOutPresented}
          onPresentedChange={setSignOutPresented}
          onConfirm={() => void auth.signOut()}
        />
      </NativeListScreen>
    </>
  );
}
