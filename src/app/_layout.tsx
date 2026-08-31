import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SyncProvider } from "@/src/data/sync/SyncProvider";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { AppThemeProvider, useAppTheme } from "@/src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider preference="system">
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
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
      {navigator}
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
