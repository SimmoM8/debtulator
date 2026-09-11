import { SolidNavHeader } from "@/src/components/layout/SolidNavHeader";
import { Stack } from "expo-router";

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
    </SolidNavHeader>
  );
}
