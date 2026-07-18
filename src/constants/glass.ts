import { StyleSheet } from "react-native";

import { palette } from "@/src/constants/design";

export type GlassRole =
  | "surface"
  | "elevated"
  | "control"
  | "prominentControl"
  | "navigation"
  | "input";

type GlassRoleDefinition = {
  variant: "clear" | "regular";
  interactive: boolean;
  tintColor?: string;
  fallback: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  };
};

/**
 * Semantic material roles. Components choose intent; this map chooses the
 * platform rendering. Keep platform-specific decisions out of product screens.
 */
export const glass: { roles: Record<GlassRole, GlassRoleDefinition> } = {
  roles: {
    surface: {
      variant: "regular",
      interactive: false,
      fallback: {
        backgroundColor: palette.surfaceGlassElevated,
        borderColor: palette.borderGlass,
        borderWidth: StyleSheet.hairlineWidth,
      },
    },
    elevated: {
      variant: "regular",
      interactive: false,
      tintColor: "rgba(221,214,254,0.12)",
      fallback: {
        backgroundColor: palette.surfaceGlassStrong,
        borderColor: palette.borderIndigoSoft,
        borderWidth: StyleSheet.hairlineWidth,
      },
    },
    control: {
      variant: "clear",
      interactive: true,
      fallback: {
        backgroundColor: palette.surfaceRow,
        borderColor: palette.borderRow,
        borderWidth: StyleSheet.hairlineWidth,
      },
    },
    prominentControl: {
      variant: "regular",
      interactive: true,
      tintColor: palette.primary,
      fallback: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
        borderWidth: StyleSheet.hairlineWidth,
      },
    },
    navigation: {
      variant: "regular",
      interactive: false,
      fallback: {
        backgroundColor: palette.surfaceGlassStrong,
        borderColor: palette.borderIndigoSoft,
        borderWidth: StyleSheet.hairlineWidth,
      },
    },
    input: {
      variant: "clear",
      interactive: false,
      fallback: {
        backgroundColor: palette.surfaceAlt,
        borderColor: palette.border,
        borderWidth: StyleSheet.hairlineWidth,
      },
    },
  },
};
