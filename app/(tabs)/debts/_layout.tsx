import { colors } from "@/src/theme/colors";
import { Stack } from "expo-router";

export default function DebtsLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
      }}
    />
  );
}
