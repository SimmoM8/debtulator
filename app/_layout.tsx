import { Stack } from "expo-router";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Platform } from "react-native";
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
import {
  AppDataProvider,
  useAppData,
} from "@/src/presentation/providers/AppDataProvider";
import { AuthProvider } from "@/src/presentation/providers/AuthProvider";
import { CollaborationProvider } from "@/src/presentation/providers/CollaborationProvider";
import { PlatformServicesProvider } from "@/src/presentation/providers/PlatformServicesProvider";
import { AppThemeProvider } from "@/src/theme";

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
  useEffect(() => {
    installGlobalCrashHandler();

    addTelemetryBreadcrumb("app", "bootstrap_started");
  }, []);

  return (
    <SafeAreaProvider>
      <PlatformServicesProvider services={expoPlatformFileServices}>
        <CollaborationProvider gateway={collaborationGateway}>
          <AppDataProvider bootstrap={sqliteLocalDataBootstrap}>
            <ThemeSettingsBridge>
              <TelemetrySettingsBridge />

              <AuthProvider services={supabaseAuthServices}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="(tabs)" />

                  <Stack.Screen
                    name="(modals)"
                    options={{
                      presentation:
                        Platform.OS === "ios" ? "formSheet" : "modal",

                      ...(Platform.OS === "ios"
                        ? {
                            sheetAllowedDetents: [1],

                            sheetInitialDetentIndex: 0,

                            sheetGrabberVisible: true,
                          }
                        : {}),
                    }}
                  />
                </Stack>
              </AuthProvider>
            </ThemeSettingsBridge>
          </AppDataProvider>
        </CollaborationProvider>
      </PlatformServicesProvider>
    </SafeAreaProvider>
  );
}

function ThemeSettingsBridge({ children }: PropsWithChildren) {
  const data = useAppData();

  return (
    <AppThemeProvider preference={data.settings.theme}>
      {children}
    </AppThemeProvider>
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
