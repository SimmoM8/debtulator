import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTitleAlign: "center",
      }}
    />
  );
}
