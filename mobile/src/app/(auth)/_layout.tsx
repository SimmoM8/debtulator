import { Stack } from "expo-router";

import { SolidNavHeader } from "@/src/components/layout";

export default function AuthLayout() {
  return (
    <SolidNavHeader>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="sign-in"
        options={{
          title: "Sign In",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <Stack.Screen
        name="create-account"
        options={{
          title: "Create Account",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Reset Password",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </SolidNavHeader>
  );
}
