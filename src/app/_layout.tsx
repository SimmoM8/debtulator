import type { CoreDataDependencies } from "@/src/application/core/CoreDataDependencies";
import { createLocalCoreDataDependencies } from "@/src/infrastructure/sqlite/createLocalCoreDataDependencies";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  AuthProvider,
  useAuth,
} from "@/src/presentation/providers/AuthProvider";
import { CoreDataProvider } from "@/src/presentation/providers/CoreDataProvider";
import { AppThemeProvider, useAppTheme } from "@/src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider preference="system">
        <AuthProvider>
          <AuthenticatedDataBridge />
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function AuthenticatedDataBridge() {
  const auth = useAuth();

  if (auth.loading) {
    return <AuthLoadingScreen />;
  }

  if (!auth.session) {
    return <RootNavigator authenticated={false} />;
  }

  return (
    <AuthenticatedCoreData ownerUserId={auth.session.user.id}>
      <RootNavigator authenticated />
    </AuthenticatedCoreData>
  );
}

function AuthenticatedCoreData({
  ownerUserId,
  children,
}: {
  ownerUserId: string;
  children: React.ReactNode;
}) {
  const [dependencies, setDependencies] = useState<CoreDataDependencies | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void createLocalCoreDataDependencies().then((nextDependencies) => {
      if (!cancelled) {
        setDependencies(nextDependencies);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!dependencies) {
    return <AuthLoadingScreen />;
  }

  return (
    <CoreDataProvider ownerUserId={ownerUserId} dependencies={dependencies}>
      {children}
    </CoreDataProvider>
  );
}

function RootNavigator({ authenticated }: { authenticated: boolean }) {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="(modals)"
          options={{
            presentation: Platform.OS === "ios" ? "formSheet" : "modal",

            ...(Platform.OS === "ios"
              ? {
                  sheetAllowedDetents: [1],
                  sheetInitialDetentIndex: 0,
                  sheetGrabberVisible: true,
                }
              : {}),
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

function AuthLoadingScreen() {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.loading,
        {
          backgroundColor: theme.colors.mainBackground,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
});
