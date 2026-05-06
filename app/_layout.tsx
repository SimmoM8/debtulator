import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/src/constants/design';
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
              <Stack.Screen name="auth" />
            </Stack>
            <StatusBar style="dark" />
          </ThemeProvider>
        </AuthProvider>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
