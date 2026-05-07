import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Card, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';

const checks = [
  'Buttons expose accessibility roles through shared primitives.',
  'Financial statuses use text badges in addition to color.',
  'Amounts should be spoken with direction and currency in detail rows.',
  'Charts include text summaries through analytics cards.',
  'Forms keep visible labels and validation messages.',
  'Destructive flows use explicit confirmation text.',
  'Sync and conflict states are inspectable without relying on color.',
];

export function AccessibilityAboutScreen() {
  return (
    <Screen>
      <PageHeader eyebrow="Release readiness" title="Accessibility and help" subtitle="Stage 6 accessibility checklist and production support notes." />
      <Card>
        <SectionTitle title="Accessibility pass" subtitle="Shared primitives enforce labels, roles, and stable touch targets." />
        {checks.map((check) => (
          <View key={check} style={styles.row}>
            <Badge label="checked" tone="positive" />
            <Text style={styles.body}>{check}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle title="Support info" subtitle="User-facing errors avoid raw technical details by default." />
        <Text style={styles.body}>For support, include the current screen, action attempted, sync status, and whether the device was offline. Audit logs record important financial and security actions without storing unnecessary sensitive content.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  body: {
    color: palette.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
