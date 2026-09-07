import { type ColorValue, Platform, PlatformColor } from "react-native";

import { brand } from "./brand";

/*
 * iOS can safely retain UIKit semantic colours because that
 * behaviour is already correct and consistent with iOS.
 *
 * Android deliberately DOES NOT use ?attr/... here.
 *
 * OEM theme attributes may differ between Pixel, Samsung,
 * Xiaomi, etc. Adaptive Android UI should instead consume
 * useAppTheme(), whose palette is deterministically generated
 * from our Material 3 seed.
 */
const nativeColors =
  Platform.OS === "ios"
    ? {
        background: PlatformColor("systemBackground"),
        secondaryBackground: PlatformColor("secondarySystemBackground"),
        text: PlatformColor("label"),
        secondaryText: PlatformColor("secondaryLabel"),
        placeholder: PlatformColor("placeholderText"),
        separator: PlatformColor("separator"),
        tint: PlatformColor("systemBlue"),
      }
    : {
        /*
         * Deterministic light fallbacks only.
         *
         * New/adaptive components should use useAppTheme()
         * instead of these values.
         */
        background: "#FFFBFE",
        secondaryBackground: "#F7F2FA",
        text: "#1D1B20",
        secondaryText: "#49454F",
        placeholder: "#79747E",
        separator: "#CAC4D0",
        tint: brand.colors.primary,
      };

export const colors = {
  native: {
    ...nativeColors,
  },
  brand: brand.colors,
  appBackground: nativeColors.secondaryBackground,
  mainBackground: brand.colors.primary,
  contentBackground: nativeColors.background,
  navHeaderBackground: brand.colors.primary,
  tabBarBackground: nativeColors.secondaryBackground,
  onLightBackground: nativeColors.text,
  onDarkBackground: "#FFFFFF",
  nativeControlTint: brand.colors.primary,
  heroBackground: brand.colors.primary,
  transparent: "transparent",
};

export const gradients = {
  background: [brand.colors.primary, colors.appBackground] as [
    ColorValue,
    ColorValue,
  ],
};
