import { StyleSheet } from "react-native";

import type { AppThemeColors } from "./AppThemeProvider";
import { componentTokens } from "./componentTokens";

export type ContentSurfaceVariant = "default" | "onBrand";

export type ContentSurfaceAppearance = {
  backgroundColor: string;
  borderColor: string;
  contentColor: string;
  mutedContentColor: string;
};

export function getContentSurfaceAppearance(
  colors: AppThemeColors,
  variant: ContentSurfaceVariant = "default",
): ContentSurfaceAppearance {
  if (variant === "onBrand") {
    return {
      backgroundColor: colors.onBrandSurface,
      borderColor: colors.onBrandSurfaceBorder,
      contentColor: colors.onHeroBackground,
      mutedContentColor: colors.onBrandMuted,
    };
  }

  return {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outline,
    contentColor: colors.text,
    mutedContentColor: colors.secondaryText,
  };
}

export function getContentSurfaceStyle(
  colors: AppThemeColors,
  variant: ContentSurfaceVariant = "default",
) {
  const appearance = getContentSurfaceAppearance(colors, variant);

  return {
    width: "100%" as const,
    overflow: "hidden" as const,
    backgroundColor: appearance.backgroundColor,
    borderColor: appearance.borderColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: componentTokens.surface.radius,
  };
}

export function getContentSeparatorStyle(
  colors: AppThemeColors,
  variant: ContentSurfaceVariant = "default",
) {
  const appearance = getContentSurfaceAppearance(colors, variant);

  return {
    width: "100%" as const,
    height: StyleSheet.hairlineWidth,
    backgroundColor: appearance.borderColor,
  };
}
