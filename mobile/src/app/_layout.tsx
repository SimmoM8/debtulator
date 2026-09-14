import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/src/components/feedback/ToastProvider";
import { BackendProvider } from "@/src/data/backend/BackendProvider";
import { RealtimeProvider } from "@/src/data/realtime/RealtimeProvider";
import { SyncProvider } from "@/src/data/sync/SyncProvider";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { InboxRealtimeEffects } from "@/src/features/inbox/realtime/InboxRealtimeEffects";
import { AppThemeProvider, useAppTheme } from "@/src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider preference="system">
        <ToastProvider>
          <AuthProvider>
            <BackendProvider>
              <RootNavigator />
            </BackendProvider>
          </AuthProvider>
        </ToastProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const auth = useAuth();

  if (auth.loading) {
    return <AuthLoadingScreen />;
  }

  const navigator = (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={!auth.session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={auth.session !== null}>
        <Stack.Screen name="(main)" />
      </Stack.Protected>
    </Stack>
  );

  if (!auth.session) {
    return navigator;
  }

  return (
    <SyncProvider key={auth.session.user.id} ownerUserId={auth.session.user.id}>
      <RealtimeProvider ownerUserId={auth.session.user.id}>
        <InboxRealtimeEffects />
        {navigator}
      </RealtimeProvider>
    </SyncProvider>
  );
}

function AuthLoadingScreen() {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.loading,
        {
          backgroundColor: theme.colors.heroBackground,
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
