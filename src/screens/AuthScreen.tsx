import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  PageHeader,
  Screen,
  SectionTitle,
  SegmentedControl,
  TextField,
} from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { useAuth } from '@/src/state/AuthProvider';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signup') {
        await auth.signUp({ email, password, displayName });
        setMessage('Account created. Check your email if confirmation is enabled.');
      } else if (mode === 'forgot') {
        await auth.resetPassword(email);
        setMessage('Password reset email sent.');
      } else {
        await auth.signIn({ email, password });
        router.back();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        <Button
          title="Continue without account"
          icon="phone-portrait"
          variant="secondary"
          onPress={() => router.back()}
        />
      }>
      <PageHeader
        eyebrow="Account"
        title="Debtulator account"
        subtitle="Use the app locally without an account, or sign in to link members and verify debts."
      />

      <Card tone={auth.configured ? 'mint' : 'amber'}>
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
          onChange={setMode}
        />
        {mode === 'signup' ? (
          <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
        ) : null}
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
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
            disabled={
              submitting ||
              !auth.configured ||
              !email.trim() ||
              (mode !== 'forgot' && password.length < 6) ||
              (mode === 'signup' && !displayName.trim())
            }
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: palette.negative,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  message: {
    color: palette.positive,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
