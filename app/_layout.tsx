import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/src/constants/design';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { AppDataProvider } from '@/src/state/AppDataProvider';
import { AuthProvider } from '@/src/state/AuthProvider';

export const unstable_settings = {
  anchor: '(tabs)',
};

const DebtulatorTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.brand,
    background: palette.background,
    card: palette.surface,
    text: palette.ink,
    border: palette.line,
    notification: palette.coral,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <AuthProvider>
          <ThemeProvider value={DebtulatorTheme}>
            <ErrorBoundary>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="member/[id]" />
                <Stack.Screen name="member/form" />
                <Stack.Screen name="debt/[id]" />
                <Stack.Screen name="debt/form" />
                <Stack.Screen name="event/[id]" />
                <Stack.Screen name="event/form" />
                <Stack.Screen name="expense/[id]" />
                <Stack.Screen name="expense/form" />
                <Stack.Screen name="attachment/[id]" />
                <Stack.Screen name="analytics" />
                <Stack.Screen name="export" />
                <Stack.Screen name="full-export" />
                <Stack.Screen name="import-csv" />
                <Stack.Screen name="suggestions" />
                <Stack.Screen name="sync" />
                <Stack.Screen name="conflicts" />
                <Stack.Screen name="conflict/[id]" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="backup" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="delete-account" />
                <Stack.Screen name="language" />
                <Stack.Screen name="accessibility" />
                <Stack.Screen name="payment/[id]" />
                <Stack.Screen name="payment/form" />
                <Stack.Screen name="settlement/[id]" />
                <Stack.Screen name="recurring/index" />
                <Stack.Screen name="recurring/form" />
                <Stack.Screen name="auth" />
              </Stack>
            </ErrorBoundary>
            <StatusBar style="dark" />
          </ThemeProvider>
        </AuthProvider>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
