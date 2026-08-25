import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: colors.appBackground,
        },
        headerTintColor: colors.native.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.appBackground,
        },
      }}
    >
      <Stack.Screen
        name="debt/new"
        options={{
          /*
           * Android can explicitly enter from the left.
           *
           * iOS native-stack ignores slide_from_left and uses its default
           * transition, so the initial Select Member -> New Debt transition
           * uses router.replace + animationTypeForReplace="pop" instead.
           */
          animation:
            process.env.EXPO_OS === "android" ? "slide_from_left" : "default",
          animationTypeForReplace: "pop",
        }}
      />

      <Stack.Screen name="debt/select-member" />
    </Stack>
  );
}
