import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Card, EmptyState, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, radii, spacing } from '@/src/constants/design';
import type { ChartDatum } from '@/src/services/analytics';
import type { CurrencyCode, MoneyMap } from '@/src/types/models';
import { formatMoney, formatMoneyMap } from '@/src/utils/money';

export function BarChartCard({
  title,
  subtitle,
  data,
  currency,
  secondaryLabel,
  onPressDatum,
}: {
  title: string;
  subtitle: string;
  data: ChartDatum[];
  currency?: CurrencyCode;
  secondaryLabel?: string;
  onPressDatum?: (datum: ChartDatum) => void;
}) {
  const max = Math.max(...data.map((datum) => Math.max(datum.value, datum.valueSecondary ?? 0)), 0);
  return (
    <Card>
      <SectionTitle title={title} subtitle={subtitle} />
      {data.length === 0 || max <= 0 ? (
        <EmptyState title="No analytics data" body="Add records or widen the filter to populate this chart." />
      ) : (
        <View style={styles.chartRows}>
          {data.map((datum) => (
            <Pressable
              key={`${datum.label}-${datum.currency ?? currency ?? ''}`}
              disabled={!onPressDatum}
              onPress={() => onPressDatum?.(datum)}
              style={styles.chartRow}>
              <Text style={styles.chartLabel}>{datum.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(4, (datum.value / max) * 100)}%` }]} />
                {datum.valueSecondary ? (
                  <View style={[styles.barFillSecondary, { width: `${Math.max(4, (datum.valueSecondary / max) * 100)}%` }]} />
                ) : null}
              </View>
              <Text style={styles.chartValue}>{currency || datum.currency ? formatMoney(datum.value, (currency ?? datum.currency)!) : datum.value}</Text>
            </Pressable>
          ))}
          {secondaryLabel ? (
            <View style={styles.legend}>
              <Badge label="owed to you" tone="positive" />
              <Badge label={secondaryLabel} tone="amber" />
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

export function MoneyMapListCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: { label: string; totals: MoneyMap; tone?: 'positive' | 'negative' | 'neutral' | 'amber' | 'blue' }[];
}) {
  return (
    <Card>
      <SectionTitle title={title} subtitle={subtitle} />
      {rows.length ? (
        rows.map((row) => (
          <View key={row.label} style={styles.listRow}>
            <Badge label={row.label} tone={row.tone ?? 'neutral'} />
            <Text style={styles.listValue}>{formatMoneyMap(row.totals, 'None')}</Text>
          </View>
        ))
      ) : (
        <EmptyState title="No analytics data" body="Records matching this section will appear here." />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  chartRows: {
    gap: spacing.sm,
  },
  chartRow: {
    gap: spacing.xs,
  },
  chartLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  barTrack: {
    minHeight: 14,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
    overflow: 'hidden',
    gap: 2,
  },
  barFill: {
    minHeight: 8,
    backgroundColor: palette.brand,
  },
  barFillSecondary: {
    minHeight: 6,
    backgroundColor: palette.amber,
  },
  chartValue: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  listValue: {
    flex: 1,
    textAlign: 'right',
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});
