import { colors } from "@/src/theme/colors";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export function NavHeader() {
  const isIos = Platform.OS === "ios";
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerTitleAlign: "center",
        headerTransparent: isIos,
        headerStyle: {
          backgroundColor: isIos ? colors.transparent : colors.mainBackground,
        },
        headerTintColor: isIos ? colors.native.text : colors.onDarkBackground,
        headerShadowVisible: false,
      }}
    />
  );
}
