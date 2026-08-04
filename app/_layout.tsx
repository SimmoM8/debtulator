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
import { DefaultTheme, ThemeProvider, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { InAppNotificationToast } from "@/src/components/InAppNotificationToast";
import { Button as NativeButton } from "@/src/components/ui/Button";
import {
    palette,
    spacing,
    typefaces,
    typography,
} from "@/src/constants/design";
import { RootNavigator } from "@/src/navigation/RootNavigator";
import {
    addTelemetryBreadcrumb,
    configureTelemetry,
    installGlobalCrashHandler,
} from "@/src/services/telemetry";
import { AppDataProvider, useAppData } from "@/src/state/AppDataProvider";
import { AuthProvider, useAuth } from "@/src/state/AuthProvider";

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
      addTelemetryBreadcrumb("app", "bootstrap_ready", {
        result: "fonts_loaded",
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <TelemetrySettingsBridge />
        <ThemeProvider value={DebtulatorTheme}>
          <ErrorBoundary>
            <AppDataGate>
              <AuthProvider>
                <StartupRouteGate>
                  <RootNavigator />
                  <InAppNotificationToast />
                </StartupRouteGate>
              </AuthProvider>
            </AppDataGate>
          </ErrorBoundary>
        </ThemeProvider>
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
  }, [
    data.settings.betaCrashReportingEnabled,
    data.settings.betaTelemetryEnabled,
  ]);

  return null;
}

function AppDataGate({ children }: { children: React.ReactNode }) {
  const data = useAppData();

  if (data.error) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateEyebrow}>Local data unavailable</Text>
        <Text style={styles.gateTitle}>
          Debtulator could not open its local database.
        </Text>
        <Text style={styles.gateBody}>{data.error}</Text>
        <NativeButton
          title="Try again"
          onPress={data.retryBoot}
          style={styles.gateButton}
          accessibilityHint="Attempts to load local Debtulator data again"
        />
      </View>
    );
  }

  if (data.loading || !data.ready) {
    return (
      <View style={styles.gate}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.gateLogo}
          resizeMode="contain"
        />
        <ActivityIndicator color={palette.brand} />
        <Text style={styles.gateTitle}>Debtulator</Text>
        <Text style={styles.gateBody}>Opening your local ledger...</Text>
      </View>
    );
  }

  return children;
}

function StartupRouteGate({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  const auth = useAuth();
  const segments = useSegments();
  const rootSegment = segments[0];

  useEffect(() => {
    if (auth.loading || auth.user || data.settings.hasCompletedFirstRun) {
      return;
    }
    if (rootSegment === "first-run" || rootSegment === "auth") {
      return;
    }
    router.replace("/first-run");
  }, [
    auth.loading,
    auth.user,
    data.settings.hasCompletedFirstRun,
    rootSegment,
  ]);

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
  gateLogo: {
    height: 96,
    width: 96,
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
