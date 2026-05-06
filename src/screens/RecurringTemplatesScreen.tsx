import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badges';
import { Button, Card, EmptyState, LoadingState, PageHeader, Screen, SectionTitle } from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';
import { formatMoney } from '@/src/utils/money';

export function RecurringTemplatesScreen() {
  const data = useAppData();

  if (data.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Recurring"
        title="Recurring records"
        subtitle="Generate rent, subscriptions, utilities, and repeat shared expenses without duplicates."
        action={<Button title="Add recurring" icon="repeat" onPress={() => router.push('/recurring/form')} />}
      />

      <Card tone="blue">
        <SectionTitle title="Due to generate" subtitle="App-open generation can be automatic or prompted in settings." />
        <View style={styles.actionRow}>
          <Badge label={`${data.recurringTemplates.filter((item) => item.status === 'active').length} active`} tone="blue" />
          <Badge label={`${data.recurringTemplates.filter((item) => item.nextOccurrenceDate <= new Date().toISOString().slice(0, 10)).length} due`} tone="amber" />
        </View>
        <Button title="Generate due recurring records" icon="flash" variant="secondary" onPress={() => data.generateDueRecurringRecords()} />
      </Card>

      <Card>
        {data.recurringTemplates.length > 0 ? (
          data.recurringTemplates.map((template) => (
            <View key={template.id} style={styles.row}>
              <View style={styles.flexOne}>
                <View style={styles.actionRow}>
                  <Text style={styles.rowTitle}>{template.title}</Text>
                  <Badge label={template.status} tone={template.status === 'active' ? 'positive' : 'neutral'} />
                </View>
                <Text style={styles.body}>
                  {template.type.replaceAll('_', ' ')} · {formatMoney(template.amount, template.currency)} · next {template.nextOccurrenceDate}
                </Text>
              </View>
              <Button title="Manage" icon="create" variant="secondary" onPress={() => router.push({ pathname: '/recurring/form', params: { id: template.id } })} />
            </View>
          ))
        ) : (
          <EmptyState title="No recurring records" body="Create a recurring debt or shared expense template." />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  flexOne: {
    flex: 1,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
