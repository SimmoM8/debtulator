import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NativeErrorBoundary } from "@/src/components/ios/NativeErrorBoundary";
import { NativeErrorState } from "@/src/components/ios/NativeErrorState";
import { NativeLoadingState } from "@/src/components/ios/NativeLoadingState";
import {
  addTelemetryBreadcrumb,
  configureTelemetry,
  installGlobalCrashHandler,
} from "@/src/services/telemetry";
import { AppDataProvider, useAppData } from "@/src/state/AppDataProvider";
import { AuthProvider, useAuth } from "@/src/state/AuthProvider";
import { debtulatorRolesForScheme } from "@/src/theme/brand";

export const unstable_settings = { anchor: "(tabs)" };

void SplashScreen.preventAutoHideAsync();

export default function NativeRootLayout() {
  const colorScheme = useColorScheme();
  const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const brand = debtulatorRolesForScheme(colorScheme);
  const theme = {
    ...baseTheme,
    colors: { ...baseTheme.colors, primary: brand.appTint },
  };

  useEffect(() => {
    installGlobalCrashHandler();
    addTelemetryBreadcrumb("app", "ios_native_bootstrap_started");
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <TelemetrySettingsBridge />
        <ThemeProvider value={theme}>
          <NativeErrorBoundary>
            <NativeAppDataGate>
              <AuthProvider>
                <NativeStartupRouteGate>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth" options={{ title: "Account", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="first-run" options={{ title: "Welcome to Debtulator", gestureEnabled: false, headerBackVisible: false }} />
                    <Stack.Screen name="member/[id]" options={{ title: "Member" }} />
                    <Stack.Screen name="member/form" options={{ title: "Member", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="debt/[id]" options={{ title: "Debt" }} />
                    <Stack.Screen name="debt/form" options={{ title: "Debt", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="debt/history" options={{ title: "Settled Debts" }} />
                    <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
                    <Stack.Screen name="group/form" options={{ title: "Group", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="expense/[id]" options={{ title: "Expense" }} />
                    <Stack.Screen name="expense/form" options={{ title: "Expense", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="attachment/[id]" options={{ title: "Attachment" }} />
                    <Stack.Screen name="activity" options={{ title: "Activity" }} />
                    <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
                    <Stack.Screen name="export" options={{ title: "Import & Export" }} />
                    <Stack.Screen name="full-export" options={{ title: "Full Data Export" }} />
                    <Stack.Screen name="import-csv" options={{ title: "Import CSV", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="suggestions" options={{ title: "Suggestions" }} />
                    <Stack.Screen name="sync" options={{ title: "Sync Status" }} />
                    <Stack.Screen name="conflicts" options={{ title: "Conflict Center" }} />
                    <Stack.Screen name="conflict/[id]" options={{ title: "Conflict Review" }} />
                    <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
                    <Stack.Screen name="backup" options={{ title: "Backup & Restore" }} />
                    <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
                    <Stack.Screen name="delete-account" options={{ title: "Delete Account" }} />
                    <Stack.Screen name="language" options={{ title: "Language" }} />
                    <Stack.Screen name="accessibility" options={{ title: "Accessibility & Help" }} />
                    <Stack.Screen name="payment/[id]" options={{ title: "Payment" }} />
                    <Stack.Screen name="payment/form" options={{ title: "Record Payment", presentation: "formSheet", sheetGrabberVisible: true }} />
                    <Stack.Screen name="settlement/[id]" options={{ title: "Settlement" }} />
                    <Stack.Screen name="recurring/index" options={{ title: "Recurring Records" }} />
                    <Stack.Screen name="recurring/form" options={{ title: "Recurring Record", presentation: "formSheet", sheetGrabberVisible: true }} />
                  </Stack>
                </NativeStartupRouteGate>
              </AuthProvider>
            </NativeAppDataGate>
          </NativeErrorBoundary>
        </ThemeProvider>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}

function TelemetrySettingsBridge() {
  const data = useAppData();
  useEffect(() => {
    configureTelemetry({ telemetryEnabled: data.settings.betaTelemetryEnabled, crashReportingEnabled: data.settings.betaCrashReportingEnabled });
  }, [data.settings.betaCrashReportingEnabled, data.settings.betaTelemetryEnabled]);
  return null;
}

function NativeAppDataGate({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  if (data.error) return <NativeErrorState message={data.error} onRetry={data.retryBoot} />;
  if (data.loading || !data.ready) return <NativeLoadingState />;
  return children;
}

function NativeStartupRouteGate({ children }: { children: React.ReactNode }) {
  const data = useAppData();
  const auth = useAuth();
  const segments = useSegments();
  const rootSegment = segments[0];
  useEffect(() => {
    if (auth.loading || auth.user || data.settings.hasCompletedFirstRun) return;
    if (rootSegment === "first-run" || rootSegment === "auth") return;
    router.replace("/first-run");
  }, [auth.loading, auth.user, data.settings.hasCompletedFirstRun, rootSegment]);
  return children;
}
