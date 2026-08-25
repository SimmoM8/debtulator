import { ColorValue, Platform, PlatformColor } from "react-native";

import { brand } from "./brand";

const materialColors = {
  background: "#FFFBFE",
  secondaryBackground: "#F7F2FA",
  text: "#1D1B20",
  secondaryText: "#49454F",
  separator: "#CAC4D0",
  tint: "#6750A4",
} as const;

/*
 DO NOT MODIFY THE NATIVE COLORS BELOW.
 These colors are used to ensure that the app's colors
 match the system colors on iOS and Android.
 */
const nativeColors =
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

/*
 Global colors exported and used throughout the app.
 */
export const colors = {
  native: { ...nativeColors },

  brand: brand.colors,

  appBackground: nativeColors.secondaryBackground,
  mainBackground: brand.colors.primary,
  contentBackground: nativeColors.background,

  navHeaderBackground: brand.colors.primary,
  tabBarBackground: nativeColors.secondaryBackground,

  onLightBackground: nativeColors.text,
  onDarkBackground: "#FFFFFF",

  nativeControlTint: brand.colors.secondary,

  heroBackground: brand.colors.primary,

  transparent: "transparent",
};

export const gradients = {
  background: [brand.colors.primary, colors.appBackground] as [
    ColorValue,
    ColorValue,
  ],
};
