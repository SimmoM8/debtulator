import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/src/state/AuthProvider';
import type { CurrencyCode } from '@/src/types/models';

export function SettingsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState(auth.identity.profile?.displayName ?? auth.identity.displayName);
  const [phone, setPhone] = useState(auth.identity.profile?.phone ?? '');
  const [profileCurrency, setProfileCurrency] = useState<CurrencyCode>(auth.identity.baseCurrency);

  const rates = useMemo(
    () =>
      Object.fromEntries(
        data.currencyRates.map((rate) => [rate.currency, rateDrafts[rate.currency] ?? String(rate.rateToSek)]),
      ),
    [data.currencyRates, rateDrafts],
  );

  useEffect(() => {
    setDisplayName(auth.identity.profile?.displayName ?? auth.identity.displayName);
    setPhone(auth.identity.profile?.phone ?? '');
    setProfileCurrency(auth.identity.baseCurrency);
  }, [auth.identity.baseCurrency, auth.identity.displayName, auth.identity.profile]);

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
        eyebrow="Settings"
        title="Settings"
        subtitle="Local data remains on-device. Accounts unlock linking and verification."
      />

      <Card tone={auth.user ? 'mint' : 'amber'}>
        <SectionTitle
          title="Account"
          subtitle={auth.user ? 'Signed in account identity and local profile cache.' : 'Continue without account keeps your ledger local/private.'}
        />
        {auth.user ? (
          <>
            <Text style={styles.rowBody}>Signed in as {auth.identity.email ?? auth.user.id}</Text>
            <TextField label="Display name" value={displayName} onChangeText={setDisplayName} />
            <TextField label="Phone placeholder" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <SelectChips
              label="Profile base currency"
              value={profileCurrency}
              options={CURRENCIES.map((currency) => ({ label: currency, value: currency }))}
              onChange={setProfileCurrency}
            />
            <View style={styles.buttonRow}>
              <Button
                title="Save profile"
                icon="save"
                onPress={() => auth.updateProfile({ displayName, phone, baseCurrency: profileCurrency })}
              />
              <Button title="Sign out" icon="log-out" variant="secondary" onPress={auth.signOut} />
            </View>
            <Text style={styles.rowBody}>Delete account and data export controls are placeholders for production hardening.</Text>
          </>
        ) : (
          <>
            <Text style={styles.rowBody}>
              Signed-out mode is fully usable. Sign in when you want linked members, verification requests, and future synced events.
            </Text>
            <Button title="Sign in or create account" icon="person-circle" onPress={() => router.push('/auth')} />
          </>
        )}
      </Card>

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
