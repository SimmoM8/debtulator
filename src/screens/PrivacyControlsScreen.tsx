import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, PageHeader, Screen, SectionTitle, SelectChips } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';
import type { DebtVisibility, EventVisibility } from '@/src/types/models';

export function PrivacyControlsScreen() {
  const data = useAppData();

  return (
    <Screen>
      <PageHeader eyebrow="Privacy" title="Privacy controls" subtitle="Signing in, linking members, or joining events never auto-shares private records." />

      <Card>
        <SectionTitle title="Defaults" subtitle="New records stay private unless you choose shared visibility." />
        <SelectChips
          label="Default debt visibility"
          value={data.settings.defaultDebtVisibility}
          onChange={(defaultDebtVisibility: DebtVisibility) => data.updateSettings({ defaultDebtVisibility })}
          options={[
            { label: 'Private', value: 'private' },
            { label: 'Shared member', value: 'shared_with_involved_member' },
          ]}
        />
        <SelectChips
          label="Default event visibility"
          value={data.settings.defaultEventVisibility}
          onChange={(defaultEventVisibility: EventVisibility) => data.updateSettings({ defaultEventVisibility })}
          options={[
            { label: 'Private', value: 'private' },
            { label: 'Shared', value: 'shared' },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle title="Data handling" subtitle="Account backup and shared attachments require explicit opt-in." />
        <ToggleRow title="Show sensitive notification details" body="When off, push/email bodies use neutral wording." value={data.settings.showSensitiveDetailsInNotifications} onValueChange={(showSensitiveDetailsInNotifications) => data.updateSettings({ showSensitiveDetailsInNotifications })} />
        <ToggleRow title="Sync private local data to account backup" body="Private local records are not uploaded automatically after sign-in." value={data.settings.syncPrivateLocalDataToAccountBackup} onValueChange={(syncPrivateLocalDataToAccountBackup) => data.updateSettings({ syncPrivateLocalDataToAccountBackup })} />
        <ToggleRow title="Upload attachments for shared records" body="Shared receipt/proof uploads are disabled unless enabled here or per record." value={data.settings.uploadAttachmentsForSharedRecords} onValueChange={(uploadAttachmentsForSharedRecords) => data.updateSettings({ uploadAttachmentsForSharedRecords })} />
        <ToggleRow title="Analytics include rejected/disputed" body="Off by default so disputed records do not affect summaries silently." value={data.settings.analyticsIncludeRejectedDisputed} onValueChange={(analyticsIncludeRejectedDisputed) => data.updateSettings({ analyticsIncludeRejectedDisputed })} />
        <ToggleRow title="Smart suggestions only on private local data" body="Keeps suggestion processing local unless you choose otherwise." value={data.settings.smartSuggestionsPrivateOnly} onValueChange={(smartSuggestionsPrivateOnly) => data.updateSettings({ smartSuggestionsPrivateOnly })} />
      </Card>

      <Card>
        <SectionTitle title="External notifications" subtitle="The in-app notification center still works when these are off." />
        <ToggleRow title="Push notifications" body="Expo-compatible token registration is enabled only after permission." value={data.settings.pushNotificationsEnabled} onValueChange={(pushNotificationsEnabled) => data.updateSettings({ pushNotificationsEnabled })} />
        <ToggleRow title="Email notifications" body="Backend-ready preferences for important account and shared ledger events." value={data.settings.emailNotificationsEnabled} onValueChange={(emailNotificationsEnabled) => data.updateSettings({ emailNotificationsEnabled })} />
        <ToggleRow title="Quiet hours" body={`${data.settings.quietHoursStart} to ${data.settings.quietHoursEnd}`} value={data.settings.quietHoursEnabled} onValueChange={(quietHoursEnabled) => data.updateSettings({ quietHoursEnabled })} />
        <View style={styles.actions}>
          <Button title="Verification" icon="shield-checkmark" variant={data.settings.notificationVerificationEnabled ? 'primary' : 'secondary'} onPress={() => data.updateSettings({ notificationVerificationEnabled: !data.settings.notificationVerificationEnabled })} />
          <Button title="Events" icon="people" variant={data.settings.notificationEventEnabled ? 'primary' : 'secondary'} onPress={() => data.updateSettings({ notificationEventEnabled: !data.settings.notificationEventEnabled })} />
          <Button title="Payments" icon="card" variant={data.settings.notificationPaymentSettlementEnabled ? 'primary' : 'secondary'} onPress={() => data.updateSettings({ notificationPaymentSettlementEnabled: !data.settings.notificationPaymentSettlementEnabled })} />
          <Button title="Reminders" icon="alarm" variant={data.settings.notificationReminderEnabled ? 'primary' : 'secondary'} onPress={() => data.updateSettings({ notificationReminderEnabled: !data.settings.notificationReminderEnabled })} />
          <Button title="Comments" icon="chatbubble" variant={data.settings.notificationCommentEnabled ? 'primary' : 'secondary'} onPress={() => data.updateSettings({ notificationCommentEnabled: !data.settings.notificationCommentEnabled })} />
        </View>
      </Card>
    </Screen>
  );
}

function ToggleRow({ title, body, value, onValueChange }: { title: string; body: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: palette.lineStrong, true: palette.brandSoft }} thumbColor={value ? palette.brand : '#FFFFFF'} />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  switchText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
