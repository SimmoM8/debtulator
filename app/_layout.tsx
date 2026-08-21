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

import {
    addTelemetryBreadcrumb,
    configureTelemetry,
    configureTelemetrySink,
    installGlobalCrashHandler,
} from "@/src/application/observability/telemetry";
import { createApiCollaborationGateway } from "@/src/infrastructure/api/ApiCollaborationGateway";
import { createDebtulatorApiClient } from "@/src/infrastructure/api/DebtulatorApiClient";
import { createHttpTelemetrySink } from "@/src/infrastructure/api/HttpTelemetrySink";
import { supabaseAuthServices } from "@/src/infrastructure/auth/clientAuthAdapter";
import { sqliteLocalDataBootstrap } from "@/src/infrastructure/sqlite/localDataBootstrap";
import { expoPlatformFileServices } from "@/src/platform/files/expoPlatformFileServices";
import { ErrorBoundary } from "@/src/presentation/components/ErrorBoundary";
import { InAppNotificationToast } from "@/src/presentation/components/InAppNotificationToast";
import { Button as NativeButton } from "@/src/presentation/design-system/Button";
import { RootNavigator } from "@/src/presentation/navigation/RootNavigator";
import {
    AppDataProvider,
    useAppData,
} from "@/src/presentation/providers/AppDataProvider";
import {
    AuthProvider,
    useAuth,
} from "@/src/presentation/providers/AuthProvider";
import { CollaborationProvider } from "@/src/presentation/providers/CollaborationProvider";
import { PlatformServicesProvider } from "@/src/presentation/providers/PlatformServicesProvider";
import {
    palette,
    spacing,
    typefaces,
    typography,
} from "@/src/presentation/theme/design";

export const unstable_settings = {
  anchor: "(tabs)",
};

void SplashScreen.preventAutoHideAsync();

const DebtulatorTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.brand,
    background: "transparent",
    card: palette.surfaceGlassStrong,
    text: palette.ink,
    border: palette.borderIndigoSoft,
    notification: palette.coral,
  },
};

const apiClient = createDebtulatorApiClient(
  process.env.EXPO_PUBLIC_API_URL ?? "",
  () => supabaseAuthServices.getAccessToken(),
);
const collaborationGateway = createApiCollaborationGateway(
  apiClient,
  expoPlatformFileServices.files,
);
configureTelemetrySink(createHttpTelemetrySink(apiClient));

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
    <View style={styles.root}>
      <PlatformServicesProvider services={expoPlatformFileServices}>
        <CollaborationProvider gateway={collaborationGateway}>
          <SafeAreaProvider>
            <AppDataProvider bootstrap={sqliteLocalDataBootstrap}>
              <TelemetrySettingsBridge />
              <ThemeProvider value={DebtulatorTheme}>
                <ErrorBoundary>
                  <AppDataGate>
                    <AuthProvider services={supabaseAuthServices}>
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
        </CollaborationProvider>
      </PlatformServicesProvider>
    </View>
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
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  gate: {
    alignItems: "center",
    backgroundColor: "transparent",
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
