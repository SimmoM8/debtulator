import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  const isIos = Platform.OS === "ios";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen
        name="(modals)"
        options={{
          presentation: isIos ? "formSheet" : "modal",

          ...(isIos
            ? {
                sheetAllowedDetents: [1],
                sheetInitialDetentIndex: 0,
                sheetGrabberVisible: true,
              }
            : {}),
        }}
      />
    </Stack>
  );
}
