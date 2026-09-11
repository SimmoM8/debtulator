import { Stack } from "expo-router";

import { SolidNavHeader } from "@/src/components/layout";

export default function AuthModalsLayout() {
  return (
    <SolidNavHeader>
      <Stack.Screen
        name="sign-in"
        options={{
          title: "Sign In",
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
    </SolidNavHeader>
  );
}
