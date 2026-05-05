import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
  SelectChips,
  TextField,
} from '@/src/components/ui/Primitives';
import { CURRENCIES } from '@/src/constants/currencies';
import { palette, spacing } from '@/src/constants/design';
import { useAppData } from '@/src/state/AppDataProvider';
import type { CurrencyCode } from '@/src/types/models';

export function SettingsScreen() {
  const data = useAppData();
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  const rates = useMemo(
    () =>
      Object.fromEntries(
        data.currencyRates.map((rate) => [rate.currency, rateDrafts[rate.currency] ?? String(rate.rateToSek)]),
      ),
    [data.currencyRates, rateDrafts],
  );

  if (data.loading) {
    return <LoadingState />;
  }

  async function saveRates() {
    for (const currency of CURRENCIES) {
      const rate = Number(rates[currency]);
      if (Number.isFinite(rate) && rate > 0) {
        await data.updateRate(currency, rate);
      }
    }
    setRateDrafts({});
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Local settings"
        title="Settings"
        subtitle="Stage 1 keeps data on-device and uses editable static exchange rates."
      />

      <Card>
        <SectionTitle title="Base currency" subtitle="Estimated balances are approximate and never merge native balances." />
        <SelectChips
          value={data.settings.baseCurrency}
          options={CURRENCIES.map((currency) => ({ label: currency, value: currency }))}
          onChange={(baseCurrency: CurrencyCode) => data.updateSettings({ baseCurrency })}
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.rowTitle}>Show estimated base-currency balances</Text>
            <Text style={styles.rowBody}>Uses the local exchange-rate table below.</Text>
          </View>
          <Switch
            value={data.settings.showEstimatedBase}
            onValueChange={(showEstimatedBase) => data.updateSettings({ showEstimatedBase })}
            trackColor={{ false: palette.lineStrong, true: palette.brandSoft }}
            thumbColor={data.settings.showEstimatedBase ? palette.brand : '#FFFFFF'}
          />
        </View>

        <SelectChips
          label="Theme"
          value={data.settings.theme}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark later', value: 'dark' },
          ]}
          onChange={(theme) => data.updateSettings({ theme })}
        />
      </Card>

      <Card>
        <SectionTitle title="Exchange rates" subtitle="Rates are stored locally as value in SEK; a provider can replace this table later." />
        {CURRENCIES.map((currency) => (
          <TextField
            key={currency}
            label={`${currency} to SEK`}
            value={rates[currency] ?? ''}
            onChangeText={(value) => setRateDrafts((current) => ({ ...current, [currency]: value }))}
            keyboardType="numeric"
          />
        ))}
        <Button title="Save exchange rates" icon="save" onPress={saveRates} />
      </Card>

      <Card tone="amber">
        <SectionTitle title="Development data" subtitle="Reset local SQLite data while building Stage 1." />
        <View style={styles.buttonRow}>
          <Button
            title="Reset demo data"
            icon="refresh"
            variant="secondary"
            onPress={() =>
              Alert.alert('Reset demo data?', 'This replaces all local records with the Stage 1 demo ledger.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => data.resetLocalData(true) },
              ])
            }
          />
          <Button
            title="Clear local data"
            icon="trash"
            variant="danger"
            onPress={() =>
              Alert.alert('Clear local data?', 'This deletes members, debts, events, and expenses from SQLite.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => data.resetLocalData(false) },
              ])
            }
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  switchText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  rowBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
