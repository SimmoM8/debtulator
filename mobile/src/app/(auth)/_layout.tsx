import { Stack } from "expo-router";

import { useAppTheme } from "@/src/theme";

export default function AuthLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: theme.colors.appBackground,
        },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.appBackground,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="create-account"
        options={{
          title: "Create Account",
        }}
      />

      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Reset Password",
        }}
      />
    </Stack>
  );
}
