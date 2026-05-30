import {
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    useFonts as useManropeFonts,
} from "@expo-google-fonts/manrope";
import {
    Sora_600SemiBold,
    Sora_700Bold,
    useFonts as useSoraFonts,
} from "@expo-google-fonts/sora";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { palette, spacing, typefaces, typography } from "@/src/constants/design";
import { AppDataProvider, useAppData } from "@/src/state/AppDataProvider";
import { AuthProvider } from "@/src/state/AuthProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

void SplashScreen.preventAutoHideAsync();

const DebtulatorTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.brand,
    background: palette.background,
    card: palette.surfaceGlassStrong,
    text: palette.ink,
    border: palette.borderIndigoSoft,
    notification: palette.coral,
  },
};

export default function RootLayout() {
  const [manropeLoaded] = useManropeFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [soraLoaded] = useSoraFonts({
    Sora_600SemiBold,
    Sora_700Bold,
  });

  const fontsLoaded = manropeLoaded && soraLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <ThemeProvider value={DebtulatorTheme}>
          <ErrorBoundary>
            <AppDataGate>
              <AuthProvider>
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
              </AuthProvider>
            </AppDataGate>
          </ErrorBoundary>
          <StatusBar style="dark" />
        </ThemeProvider>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}

function AppDataGate({ children }: { children: React.ReactNode }) {
  const data = useAppData();

  if (data.error) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateEyebrow}>Local data unavailable</Text>
        <Text style={styles.gateTitle}>Debtulator could not open its local database.</Text>
        <Text style={styles.gateBody}>{data.error}</Text>
        <Pressable accessibilityRole="button" onPress={data.retryBoot} style={styles.gateButton}>
          <Text style={styles.gateButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (data.loading || !data.ready) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={palette.brand} />
        <Text style={styles.gateBody}>Opening local ledger...</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  gate: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  gateEyebrow: {
    color: palette.muted,
    fontFamily: typefaces.bodyStrong,
    fontSize: typography.size.sm,
    textTransform: "uppercase",
  },
  gateTitle: {
    color: palette.ink,
    fontFamily: typefaces.displayMedium,
    fontSize: typography.size.h2,
    textAlign: "center",
  },
  gateBody: {
    color: palette.muted,
    fontFamily: typefaces.body,
    fontSize: typography.size.md,
    lineHeight: typography.line.lg,
    maxWidth: 460,
    textAlign: "center",
  },
  gateButton: {
    backgroundColor: palette.brand,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  gateButtonText: {
    color: "#FFFFFF",
    fontFamily: typefaces.bodyHeavy,
    fontSize: typography.size.md,
  },
});
