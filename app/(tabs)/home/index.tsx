import { Stack } from "expo-router";

import { HomeScreen } from "@/src/presentation/screens/HomeScreen";

export default function HomeRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Home",
        }}
      />

      <HomeScreen />
    </>
  );
}
