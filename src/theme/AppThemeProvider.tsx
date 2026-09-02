import { getMaterialColors } from "@expo/ui/jetpack-compose";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";
import { Platform, useColorScheme } from "react-native";

import { brand } from "./brand";
import { nativeTheme } from "./nativeTheme";

export type AppColorScheme = "light" | "dark";

export type AppThemePreference = "system" | AppColorScheme;

export type AppThemeColors = {
  appBackground: string;
  contentBackground: string;
  surfaceContainer: string;

  text: string;
  secondaryText: string;
  placeholder: string;

  separator: string;
  outline: string;

  controlTint: string;
  controlContainer: string;
  onControlContainer: string;
  controlSurface: string;
  onControlSurface: string;

  mainBackground: string;
  heroBackground: string;
  onHeroBackground: string;

  onBrandSurface: string;
  onBrandSurfaceBorder: string;
  onBrandMuted: string;

  tabBarBackground: string;

  positive: string;
  negative: string;

  transparent: string;
};

type AppThemeContextValue = {
  scheme: AppColorScheme;
  colors: AppThemeColors;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = PropsWithChildren<{
  preference: AppThemePreference;
}>;

export function AppThemeProvider({
  preference,
  children,
}: AppThemeProviderProps) {
  const systemScheme = useColorScheme();

  const scheme: AppColorScheme =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const colors = useMemo(() => createThemeColors(scheme), [scheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      scheme,
      colors,
    }),
    [colors, scheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider.");
  }

  return context;
}

function createThemeColors(scheme: AppColorScheme): AppThemeColors {
  if (Platform.OS === "android") {
    return createAndroidThemeColors(scheme);
  }

  return createAppleThemeColors(scheme);
}

function createAndroidThemeColors(scheme: AppColorScheme): AppThemeColors {
  const material = getMaterialColors({
    seedColor: nativeTheme.seedColor,
    scheme,
  });

  return {
    appBackground: material.surfaceContainerLow,
    contentBackground: material.surface,
    surfaceContainer: material.surfaceContainer,

    text: material.onSurface,
    secondaryText: material.onSurfaceVariant,

    placeholder: withOpacity(
      material.onSurfaceVariant,
      scheme === "dark" ? 0.62 : 0.54,
    ),

    separator: material.outlineVariant,
    outline: material.outlineVariant,

    controlTint: material.primary,
    controlContainer: material.primaryContainer,
    onControlContainer: material.onPrimaryContainer,

    controlSurface: material.surfaceContainerLow,
    onControlSurface: material.onSurface,

    mainBackground: brand.colors.primary,
    heroBackground: brand.colors.primary,
    onHeroBackground: "#FFFFFF",

    onBrandSurface: withOpacity("#FFFFFF", 0.1),
    onBrandSurfaceBorder: withOpacity("#FFFFFF", 0.16),
    onBrandMuted: withOpacity("#FFFFFF", 0.72),

    tabBarBackground: material.surfaceContainerLow,

    positive: brand.colors.positive,
    negative: brand.colors.negative,

    transparent: "transparent",
  };
}

function createAppleThemeColors(scheme: AppColorScheme): AppThemeColors {
  if (scheme === "dark") {
    return {
      appBackground: "#1C1C1E",
      contentBackground: "#000000",
      surfaceContainer: "#2C2C2E",

      text: "#FFFFFF",
      secondaryText: "rgba(235, 235, 245, 0.60)",
      placeholder: "rgba(235, 235, 245, 0.30)",

      separator: "rgba(84, 84, 88, 0.60)",
      outline: "rgba(84, 84, 88, 0.60)",

      controlTint: brand.colors.secondary,
      controlContainer: "#4A3B70",
      onControlContainer: "#FFFFFF",

      controlSurface: "#2C2C2E",
      onControlSurface: "#FFFFFF",

      mainBackground: brand.colors.primary,
      heroBackground: brand.colors.primary,
      onHeroBackground: "#FFFFFF",

      onBrandSurface: withOpacity("#FFFFFF", 0.1),
      onBrandSurfaceBorder: withOpacity("#FFFFFF", 0.16),
      onBrandMuted: withOpacity("#FFFFFF", 0.72),

      tabBarBackground: "#1C1C1E",

      positive: brand.colors.positive,
      negative: brand.colors.negative,

      transparent: "transparent",
    };
  }

  return {
    appBackground: "#F2F2F7",
    contentBackground: "#FFFFFF",
    surfaceContainer: "#FFFFFF",

    text: "#000000",
    secondaryText: "rgba(60, 60, 67, 0.60)",
    placeholder: "rgba(60, 60, 67, 0.30)",

    separator: "rgba(60, 60, 67, 0.29)",
    outline: "rgba(60, 60, 67, 0.29)",

    controlTint: brand.colors.primary,
    controlContainer: brand.colors.secondary,
    onControlContainer: brand.colors.primary,

    controlSurface: "#FFFFFF",
    onControlSurface: "#000000",

    mainBackground: brand.colors.primary,
    heroBackground: brand.colors.primary,
    onHeroBackground: "#FFFFFF",

    onBrandSurface: withOpacity("#FFFFFF", 0.1),
    onBrandSurfaceBorder: withOpacity("#FFFFFF", 0.16),
    onBrandMuted: withOpacity("#FFFFFF", 0.72),

    tabBarBackground: "#F2F2F7",

    positive: brand.colors.positive,
    negative: brand.colors.negative,

    transparent: "transparent",
  };
}

function withOpacity(color: string, opacity: number) {
  if (/^#[0-9a-fA-F]{8}$/.test(color)) {
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

    return `${color.slice(0, 7)}${alpha}`;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

    return `${color}${alpha}`;
  }

  return color;
}
