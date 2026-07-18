import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AnimatedBrandBar, AuthBackgroundPattern } from '@/src/components/auth/AuthFlowVisuals';
import { CurrencySelect } from '@/src/components/ui/CurrencySelect';
import { Button, Card, PageHeader, Screen, TextField } from '@/src/components/ui/Primitives';
import { palette, spacing, typefaces, typography } from '@/src/constants/design';
import type { CurrencyCode } from '@/src/types/models';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';

type FirstRunStep = 'choice' | 'local';

export function FirstRunScreen() {
  const data = useAppData();
  const auth = useAuth();
  const params = useLocalSearchParams<{ local?: string }>();
  const { height, width } = useWindowDimensions();
  const [step, setStep] = useState<FirstRunStep>(params.local === '1' ? 'local' : 'choice');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(data.settings.baseCurrency);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn() {
    setSubmitting(true);
    setError(null);
    try {
      await auth.signIn({ email, password });
      await data.updateSettings({ hasCompletedFirstRun: true });
      router.replace('/');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function completeLocalSetup() {
    setSubmitting(true);
    try {
      await data.updateSettings({
        localDisplayName: name.trim(),
        baseCurrency: currency,
        hasCompletedFirstRun: true,
      });
      router.replace('/');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        step === 'local' ? (
          <Button
            title="Start using Debtulator"
            icon="checkmark"
            onPress={completeLocalSetup}
            disabled={submitting || !name.trim()}
          />
        ) : null
      }
    >
      {step === 'local' ? (
        <PageHeader
          title="Local setup"
          subtitle="Set the name and currency for this device."
          showBackButton={false}
        />
      ) : null}

      {step === 'choice' ? (
        <View style={[styles.centerStage, { minHeight: Math.max(520, height - 180) }]}>
          <AuthBackgroundPattern />

          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Welcome to Debtulator</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue, or start locally.</Text>
          </View>

          <Card
            tone="lavender"
            wrapperStyle={[styles.signInCardWrap, { maxWidth: width >= 900 ? 720 : 680 }]}
            style={styles.signInCard}
          >
            <View style={styles.cardAccent}><AnimatedBrandBar /></View>
            <Text style={styles.cardTitle}>Sign in</Text>
            <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
            <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Continue"
              icon="log-in"
              onPress={signIn}
              disabled={submitting || !auth.configured || !email.trim() || password.length < 6}
            />
          </Card>

          <View style={[styles.secondaryActions, { maxWidth: width >= 900 ? 720 : 680 }]}>
            <Text style={styles.secondaryText}>
              New here?{' '}
              <Text style={styles.secondaryLink} onPress={() => router.push('/auth?mode=signup&firstRun=1')}>
                Create account
              </Text>
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip for now" onPress={() => setStep('local')} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Card tone="lavender">
          <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <CurrencySelect label="Default currency" value={currency} onChange={setCurrency} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerStage: {
    alignItems: 'center',
    gap: spacing.lg,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  welcome: {
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 560,
  },
  welcomeTitle: {
    color: palette.textPrimary,
    fontFamily: typefaces.displayMedium,
    fontSize: typography.size.h1,
    lineHeight: typography.line.displaySm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: palette.muted,
    fontFamily: typefaces.body,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    textAlign: 'center',
  },
  signInCardWrap: {
    width: '100%',
  },
  signInCard: {
    gap: spacing.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  cardAccent: {
    marginBottom: spacing.sm,
    width: '100%',
  },
  cardTitle: {
    color: palette.textPrimary,
    fontFamily: typefaces.displayMedium,
    fontSize: typography.size.xxl,
    lineHeight: typography.line.h1,
  },
  error: {
    color: palette.negative,
    fontFamily: typefaces.bodyStrong,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
  },
  secondaryActions: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  secondaryText: {
    color: palette.muted,
    fontFamily: typefaces.body,
    fontSize: typography.size.base,
    lineHeight: typography.line.xl,
    textAlign: 'center',
  },
  secondaryLink: {
    color: palette.textPrimary,
    fontFamily: typefaces.bodyStrong,
  },
  skipButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skipText: {
    color: palette.muted,
    fontFamily: typefaces.bodyStrong,
    fontSize: typography.size.sm,
  },
});
