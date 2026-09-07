import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
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
    </Stack>
  );
}
