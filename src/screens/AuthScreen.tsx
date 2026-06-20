import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DebtulatorOrbitIllustration } from '@/src/components/illustrations/DebtulatorOrbitIllustration';
import {
  Button,
  Card,
  DropdownSelect,
  PageHeader,
  Screen,
  SectionTitle,
  SegmentedControl,
  TextField,
} from '@/src/components/ui/Primitives';
import { palette, spacing, typefaces, typography } from '@/src/constants/design';
import { CURRENCIES } from '@/src/constants/currencies';
import {
  SUPPORTED_COUNTRIES,
  currencyForCountry,
  type SupportedCountryCode,
} from '@/src/constants/onboarding';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { CurrencyCode } from '@/src/types/models';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen() {
  const auth = useAuth();
  const data = useAppData();
  const params = useLocalSearchParams<{ mode?: string; firstRun?: string }>();
  const initialMode: AuthMode = params.mode === 'signup' ? 'signup' : params.mode === 'forgot' ? 'forgot' : 'signin';
  const firstRun = params.firstRun === '1';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<SupportedCountryCode>('SE');
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(currencyForCountry('SE'));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currencyOptions = useMemo(
    () => CURRENCIES.map((currency) => ({ label: currency, value: currency })),
    [],
  );

  async function finishAuthenticatedFlow() {
    if (firstRun) {
      await data.updateSettings({ hasCompletedFirstRun: true });
      router.replace('/');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signup') {
        await auth.signUp({
          firstName,
          lastName,
          email,
          password,
          phone,
          country,
          baseCurrency,
        });
        setMessage('Account created. Check your email if confirmation is enabled.');
        await finishAuthenticatedFlow();
      } else if (mode === 'forgot') {
        await auth.resetPassword(email);
        setMessage('Password reset email sent.');
      } else {
        await auth.signIn({ email, password });
        await finishAuthenticatedFlow();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled =
    submitting ||
    !auth.configured ||
    !email.trim() ||
    (mode !== 'forgot' && password.length < 6) ||
    (mode === 'signup' && (!firstName.trim() || !lastName.trim() || !phone.trim()));

  return (
    <Screen
      footer={
        <Button
          title={firstRun ? 'Skip for now' : 'Continue without account'}
          icon="phone-portrait"
          variant="secondary"
          onPress={() => (firstRun ? router.replace('/first-run') : router.back())}
        />
      }
    >
      <PageHeader eyebrow="Account" title={mode === 'signup' ? 'Create account' : 'Debtulator account'} />

      <Card tone="lavender" style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroLabel}>Local first</Text>
          <Text style={styles.heroTitle}>
            {mode === 'signup' ? 'Set up your shared profile.' : 'Choose when Debtulator becomes shared.'}
          </Text>
          <Text style={styles.heroBody}>
            {mode === 'signup'
              ? 'Your profile powers member links, verification, shared groups, and account sync.'
              : 'Stay local-only for private tracking, or sign in when you want member links and verification.'}
          </Text>
        </View>
        <View style={styles.heroArtWrap}>
          <DebtulatorOrbitIllustration width={132} height={104} compact />
        </View>
      </Card>

      <Card tone="lavender">
        <SectionTitle
          title="Authentication"
          subtitle={
            auth.configured
              ? 'Supabase Auth stores the account session securely on this device.'
              : 'Supabase environment variables are missing, so local-only mode remains active.'
          }
        />
        <SegmentedControl
          value={mode}
          options={[
            { label: 'Sign in', value: 'signin' },
            { label: 'Sign up', value: 'signup' },
            { label: 'Reset', value: 'forgot' },
          ]}
          onChange={(nextMode) => {
            setMode(nextMode);
            setError(null);
            setMessage(null);
          }}
        />

        {mode === 'signup' ? (
          <>
            <View style={styles.twoColumn}>
              <TextField label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" style={styles.columnField} />
              <TextField label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" style={styles.columnField} />
            </View>
            <TextField label="Mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+46..." />
            <DropdownSelect
              label="Country"
              value={country}
              options={SUPPORTED_COUNTRIES}
              onChange={(nextCountry) => {
                setCountry(nextCountry);
                setBaseCurrency(currencyForCountry(nextCountry));
              }}
            />
            <DropdownSelect
              label="Default currency"
              value={baseCurrency}
              options={currencyOptions}
              onChange={setBaseCurrency}
            />
          </>
        ) : null}

        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
        {mode !== 'forgot' ? (
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.buttonRow}>
          <Button
            title={mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Sign in'}
            icon={mode === 'signup' ? 'person-add' : mode === 'forgot' ? 'mail' : 'log-in'}
            onPress={submit}
            disabled={disabled}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 220,
  },
  heroLabel: {
    color: palette.muted,
    fontFamily: typefaces.bodyStrong,
    fontSize: typography.size.sm,
  },
  heroTitle: {
    color: palette.ink,
    fontFamily: typefaces.displayMedium,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displayMd,
  },
  heroBody: {
    color: palette.muted,
    fontFamily: typefaces.body,
    fontSize: typography.size.base,
    lineHeight: typography.line.xlPlus,
  },
  heroArtWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderColor: palette.borderGlass,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    height: 112,
    justifyContent: 'center',
    width: 142,
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  columnField: {
    flex: 1,
    minWidth: 180,
  },
  error: {
    color: palette.negative,
    fontFamily: typefaces.bodyStrong,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
  },
  message: {
    color: palette.positive,
    fontFamily: typefaces.bodyStrong,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
