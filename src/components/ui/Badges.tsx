import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '@/src/constants/design';
import type { DebtStatus, EventStatus, VerificationStatus } from '@/src/types/models';

export function TagChips({ tags, limit }: { tags: string[]; limit?: number }) {
  const visibleTags = limit ? tags.slice(0, limit) : tags;
  const extraCount = limit && tags.length > limit ? tags.length - limit : 0;

  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {visibleTags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
      {extraCount ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>+{extraCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StatusBadge({ status }: { status: DebtStatus | EventStatus }) {
  const tone =
    status === 'active'
      ? 'positive'
      : status === 'archived' || status === 'settled'
        ? 'neutral'
        : status === 'finalising'
          ? 'amber'
          : 'blue';
  return <Badge label={statusLabel(status)} tone={tone} />;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone =
    status === 'rejected' || status === 'disputed'
      ? 'negative'
      : status === 'verified' || status === 'resolved'
        ? 'positive'
        : status === 'pending'
          ? 'amber'
          : 'blue';
  return <Badge label={verificationLabel(status)} tone={tone} />;
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'positive' | 'negative' | 'amber' | 'blue' | 'neutral';
}) {
  return (
    <View style={[styles.badge, badgeTone[tone]]}>
      <Text style={[styles.badgeText, badgeTextTone[tone]]}>{label}</Text>
    </View>
  );
}

function statusLabel(status: DebtStatus | EventStatus) {
  return status.replace('_', ' ');
}

export function verificationLabel(status: VerificationStatus) {
  return status === 'local_only' ? 'local only' : status.replace('_', ' ');
}

const badgeTone = StyleSheet.create({
  positive: { backgroundColor: palette.positiveSoft, borderColor: '#BADEC9' },
  negative: { backgroundColor: palette.negativeSoft, borderColor: '#EAC2BA' },
  amber: { backgroundColor: palette.amberSoft, borderColor: '#EBD49B' },
  blue: { backgroundColor: palette.blueSoft, borderColor: '#C9D7F2' },
  neutral: { backgroundColor: '#EFECE4', borderColor: palette.line },
});

const badgeTextTone = StyleSheet.create({
  positive: { color: palette.positive },
  negative: { color: palette.negative },
  amber: { color: '#8D5E0E' },
  blue: { color: palette.blue },
  neutral: { color: palette.muted },
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    borderRadius: radii.pill,
    backgroundColor: '#EFF2EA',
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.sm,
    minHeight: 25,
    justifyContent: 'center',
  },
  tagText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    minHeight: 25,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
});
