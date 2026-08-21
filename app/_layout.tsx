import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";
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
import {
    AuthProvider,
} from "@/src/presentation/providers/AuthProvider";
import { CollaborationProvider } from "@/src/presentation/providers/CollaborationProvider";
import { PlatformServicesProvider } from "@/src/presentation/providers/PlatformServicesProvider";

const LAVENDER = "#DDD6FE";

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
    <View style={{ flex: 1, backgroundColor: LAVENDER }}>
      <PlatformServicesProvider services={expoPlatformFileServices}>
        <CollaborationProvider gateway={collaborationGateway}>
          <SafeAreaProvider>
            <AppDataProvider bootstrap={sqliteLocalDataBootstrap}>
              <TelemetrySettingsBridge />
              <AuthProvider services={supabaseAuthServices}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: LAVENDER },
                  }}
                />
              </AuthProvider>
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
