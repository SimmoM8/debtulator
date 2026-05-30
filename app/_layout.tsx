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
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { palette } from "@/src/constants/design";
import { addTelemetryBreadcrumb, configureTelemetry, installGlobalCrashHandler } from "@/src/services/telemetry";
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
    installGlobalCrashHandler();
    addTelemetryBreadcrumb("app", "bootstrap_started");
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
      addTelemetryBreadcrumb("app", "bootstrap_ready", { result: "fonts_loaded" });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <TelemetrySettingsBridge />
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

function TelemetrySettingsBridge() {
  const data = useAppData();

  useEffect(() => {
    configureTelemetry({
      telemetryEnabled: data.settings.betaTelemetryEnabled,
      crashReportingEnabled: data.settings.betaCrashReportingEnabled,
    });
  }, [data.settings.betaCrashReportingEnabled, data.settings.betaTelemetryEnabled]);

  return null;
}
