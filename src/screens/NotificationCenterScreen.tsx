import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, PageHeader, Screen, SectionTitle, SegmentedControl } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';

type Filter = 'all' | 'unread' | 'events' | 'verification' | 'payments' | 'reminders';

export function NotificationCenterScreen() {
  const data = useAppData();
  const [filter, setFilter] = useState<Filter>('all');
  const notifications = useMemo(
    () =>
      data.notifications.filter((notification) => {
        if (filter === 'unread') {
          return !notification.readAt;
        }
        if (filter === 'events') {
          return notification.type.includes('event') || notification.type === 'claim_request';
        }
        if (filter === 'verification') {
          return notification.type.includes('verification');
        }
        if (filter === 'payments') {
          return notification.type === 'payment' || notification.type === 'settlement';
        }
        if (filter === 'reminders') {
          return notification.type === 'reminder';
        }
        return true;
      }),
    [data.notifications, filter],
  );
  const unread = data.notifications.filter((notification) => !notification.readAt).length;

  return (
    <Screen>
      <PageHeader
        eyebrow="Notifications"
        title="Notification center"
        subtitle="In-app notifications work even when push or email are disabled."
        action={<Button title="Mark all read" icon="checkmark-done" variant="secondary" onPress={data.markAllNotificationsRead} disabled={!unread} />}
      />

      <Card>
        <SectionTitle title={`${unread} unread`} subtitle="Push/email preferences only control external delivery." />
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Unread', value: 'unread' },
            { label: 'Events', value: 'events' },
            { label: 'Verify', value: 'verification' },
            { label: 'Pay', value: 'payments' },
            { label: 'Due', value: 'reminders' },
          ]}
        />
      </Card>

      <Card>
        {notifications.length ? (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.row}>
              <View style={styles.badgeLine}>
                <Badge label={notification.type.replaceAll('_', ' ')} tone={notification.readAt ? 'neutral' : 'blue'} />
              </View>
              <Text style={styles.title}>{notification.title}</Text>
              <Text style={styles.body}>{notification.body}</Text>
              <Text style={styles.meta}>{new Date(notification.createdAt).toLocaleString()}</Text>
              <View style={styles.actions}>
                {!notification.readAt ? (
                  <Button title="Mark read" icon="checkmark" variant="secondary" onPress={() => data.markNotificationRead(notification.id)} />
                ) : null}
                {notification.targetType === 'sync_conflict' && notification.targetId ? (
                  <Button title="Open" icon="chevron-forward" onPress={() => router.push(`/conflict/${notification.targetId}` as never)} />
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <EmptyState title="No notifications" body="Verification, event, payment, reminder, and sync notices will appear here." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  badgeLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  meta: {
    color: palette.faint,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
