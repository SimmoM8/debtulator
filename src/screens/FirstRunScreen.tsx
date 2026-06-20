import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
  const { height, width } = useWindowDimensions();
  const [step, setStep] = useState<FirstRunStep>('choice');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(data.settings.baseCurrency);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accentMotion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(accentMotion, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(accentMotion, {
          toValue: 0,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [accentMotion]);

  const accentPrimaryWidth = accentMotion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['58%', '40%', '24%'],
  });
  const accentMintWidth = accentMotion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['28%', '38%', '34%'],
  });
  const accentPeachWidth = accentMotion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['14%', '22%', '42%'],
  });

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
          <View pointerEvents="none" style={styles.visualField}>
            <View style={[styles.colorPlane, styles.colorPlaneTop]} />
            <View style={[styles.colorPlane, styles.colorPlaneBottom]} />
            <View style={[styles.patternLine, styles.patternLineOne]} />
            <View style={[styles.patternLine, styles.patternLineTwo]} />
            <View style={[styles.patternLine, styles.patternLineThree]} />
          </View>

          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Welcome to Debtulator</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue, or start locally.</Text>
          </View>

          <Card
            tone="lavender"
            wrapperStyle={[styles.signInCardWrap, { maxWidth: width >= 900 ? 720 : 680 }]}
            style={styles.signInCard}
          >
            <View pointerEvents="none" style={styles.cardAccent}>
              <View style={styles.accentTrack}>
                <Animated.View style={[styles.accentSegment, styles.accentStart, { width: accentPrimaryWidth }]}>
                  <LinearGradient
                    colors={[palette.primary, '#5756C4', '#43B9A0']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <Animated.View style={[styles.accentSegment, styles.accentOverlap, { width: accentMintWidth }]}>
                  <LinearGradient
                    colors={['#43B9A0', palette.mint, '#9ACFAD']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <Animated.View style={[styles.accentSegment, styles.accentOverlap, styles.accentEnd, { width: accentPeachWidth }]}>
                  <LinearGradient
                    colors={['#9ACFAD', palette.peach]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            </View>
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
  visualField: {
    bottom: -96,
    left: -spacing.screen,
    position: 'absolute',
    right: -spacing.screen,
    top: -96,
  },
  colorPlane: {
    borderRadius: 44,
    position: 'absolute',
  },
  colorPlaneTop: {
    backgroundColor: 'rgba(221,214,254,0.22)',
    height: 260,
    right: -150,
    top: -28,
    transform: [{ rotate: '-10deg' }],
    width: 390,
  },
  colorPlaneBottom: {
    backgroundColor: 'rgba(253,186,155,0.12)',
    bottom: -52,
    height: 280,
    left: -176,
    transform: [{ rotate: '-8deg' }],
    width: 430,
  },
  patternLine: {
    backgroundColor: 'rgba(55,48,163,0.07)',
    borderRadius: 999,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-16deg' }],
  },
  patternLineOne: {
    right: -82,
    top: '22%',
    width: 280,
  },
  patternLineTwo: {
    backgroundColor: 'rgba(47,191,143,0.1)',
    bottom: '24%',
    left: -108,
    width: 300,
  },
  patternLineThree: {
    backgroundColor: 'rgba(253,186,155,0.14)',
    bottom: '13%',
    right: -118,
    width: 220,
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
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    width: '100%',
  },
  accentTrack: {
    borderRadius: 999,
    elevation: 2,
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  accentSegment: {
    height: 8,
    overflow: 'hidden',
  },
  accentStart: {
    borderBottomLeftRadius: 999,
    borderTopLeftRadius: 999,
  },
  accentOverlap: {
    marginLeft: -2,
  },
  accentEnd: {
    borderBottomRightRadius: 999,
    borderTopRightRadius: 999,
  },
  cardTitle: {
    color: palette.textPrimary,
    fontFamily: typefaces.displayMedium,
    fontSize: typography.size.xxl,
    lineHeight: typography.line.xxl,
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
