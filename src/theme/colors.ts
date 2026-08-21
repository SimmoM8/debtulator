import { Platform, PlatformColor } from "react-native";

const materialColors = {
  background: "#FFFBFE",
  secondaryBackground: "#F7F2FA",
  text: "#1D1B20",
  secondaryText: "#49454F",
  separator: "#CAC4D0",
  tint: "#6750A4",
} as const;

export const colors =
  Platform.OS === "ios"
    ? {
        background: PlatformColor("systemBackground"),
        secondaryBackground: PlatformColor("secondarySystemBackground"),
        text: PlatformColor("label"),
        secondaryText: PlatformColor("secondaryLabel"),
        separator: PlatformColor("separator"),
        tint: PlatformColor("systemBlue"),
      }
    : materialColors;
