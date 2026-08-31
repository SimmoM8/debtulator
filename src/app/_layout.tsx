import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeProvider, useAppTheme } from "@/src/theme";
import { AuthProvider, useAuth } from "../../src/features/auth/AuthProvider";

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

  return (
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
