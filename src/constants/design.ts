import { Platform } from "react-native";

export const palette = {
  primary: "#3730A3",
  primaryDeep: "#24185F",
  lavender: "#DDD6FE",
  lavenderMist: "#F6F3FF",
  peach: "#FDBA9B",
  peachSoft: "rgba(253,186,155,0.16)",
  success: "#2FBF8F",
  successSoft: "rgba(47,191,143,0.16)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.16)",
  danger: "#FF6B6B",
  dangerSoft: "rgba(255,107,107,0.16)",
  background: "#FCFDFF",
  backgroundDeep: "#F7F9FE",
  surface: "#FFFFFF",
  surfaceWarm: "#FFFEFC",
  surfaceMuted: "#E9EDF7",
  surfaceGlass: "rgba(255,255,255,0.68)",
  surfaceGlassElevated: "rgba(255,255,255,0.94)",
  surfaceGlassStrong: "rgba(255,255,255,0.98)",
  surfaceRow: "rgba(255,255,255,0.72)",
  surfaceRowPressed: "rgba(247,249,255,0.92)",
  surfaceLavender: "#F7F9FF",
  surfaceAlt: "rgba(255,255,255,0.86)",
  border: "#E2E6F2",
  borderStrong: "#D5DBEA",
  borderGlass: "rgba(226,230,242,0.9)",
  borderRow: "rgba(226,230,242,0.72)",
  borderIndigoSoft: "rgba(55,48,163,0.08)",
  borderIndigo: "rgba(55,48,163,0.14)",
  canvasLine: "rgba(36,24,95,0.06)",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#8B93A4",
  shadow: "#201B63",
  ink: "#111827",
  muted: "#6B7280",
  faint: "#8B93A4",
  line: "#E5EAF4",
  lineStrong: "#D8DFEC",
  brand: "#3730A3",
  brandDark: "#24185F",
  brandSoft: "#DDD6FE",
  mint: "#2FBF8F",
  coral: "#FF6B6B",
  coralSoft: "rgba(255,107,107,0.16)",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.16)",
  blue: "#3730A3",
  blueSoft: "rgba(55,48,163,0.12)",
  purple: "#3730A3",
  purpleSoft: "rgba(221,214,254,0.22)",
  positive: "#2FBF8F",
  positiveSoft: "rgba(47,191,143,0.16)",
  negative: "#FF6B6B",
  negativeSoft: "rgba(255,107,107,0.16)",
  overlay: "rgba(36,24,95,0.12)",
  overlayStrong: "rgba(36,24,95,0.22)",
  backdropLavender: "rgba(222,228,248,0.14)",
  backdropPeach: "rgba(214,224,247,0.07)",
  backdropIndigo: "rgba(55,48,163,0.04)",
};

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
 * Semantic glass tokens shared by every platform.
 * Apple platforms map these roles to native Liquid Glass. Android and older
 * Apple releases retain the same hierarchy using stable material fallbacks.
 */
export const glass: { roles: Record<GlassRole, GlassRoleDefinition> } = {
  roles: {
    surface: {
      variant: "regular",
      interactive: false,
      fallback: {
        backgroundColor: palette.surfaceGlassElevated,
        borderColor: palette.borderGlass,
        borderWidth: StyleSheetHairlineWidth,
      },
    },
    elevated: {
      variant: "regular",
      interactive: false,
      tintColor: "rgba(221,214,254,0.12)",
      fallback: {
        backgroundColor: palette.surfaceGlassStrong,
        borderColor: palette.borderIndigoSoft,
        borderWidth: StyleSheetHairlineWidth,
      },
    },
    control: {
      variant: "clear",
      interactive: true,
      fallback: {
        backgroundColor: palette.surfaceRow,
        borderColor: palette.borderRow,
        borderWidth: StyleSheetHairlineWidth,
      },
    },
    prominentControl: {
      variant: "regular",
      interactive: true,
      tintColor: palette.primary,
      fallback: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
        borderWidth: StyleSheetHairlineWidth,
      },
    },
    navigation: {
      variant: "regular",
      interactive: false,
      fallback: {
        backgroundColor: palette.surfaceGlassStrong,
        borderColor: palette.borderIndigoSoft,
        borderWidth: StyleSheetHairlineWidth,
      },
    },
    input: {
      variant: "clear",
      interactive: false,
      fallback: {
        backgroundColor: palette.surfaceAlt,
        borderColor: palette.border,
        borderWidth: StyleSheetHairlineWidth,
      },
    },
  },
};

// Kept as a scalar to avoid importing StyleSheet into the token module.
const StyleSheetHairlineWidth = Platform.select({ web: 1, default: 0.5 }) ?? 0.5;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 22,
  screen: 18,
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
};

export const typography = {
  size: {
    xxs: 10,
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 16,
    xlPlus: 17,
    xxl: 18,
    h3: 20,
    h2: 22,
    h1: 24,
    displaySm: 28,
    displayMd: 30,
    displayLg: 32,
    displayXl: 34,
  },
  line: {
    xxs: 12,
    xs: 13,
    sm: 14,
    md: 15,
    base: 16,
    basePlus: 17,
    lg: 18,
    lgPlus: 19,
    xl: 20,
    xlPlus: 21,
    h3: 22,
    h2: 24,
    h1: 26,
    displaySm: 30,
    displayMd: 32,
    displayLg: 34,
    displayXl: 38,
  },
  title: 30,
  subtitle: 22,
  body: 16,
  small: 13,
  micro: 12,
};

export const typefaces = {
  display: "Sora_700Bold",
  displayMedium: "Sora_600SemiBold",
  body: "Manrope_500Medium",
  bodyStrong: "Manrope_700Bold",
  bodyHeavy: "Manrope_800ExtraBold",
  numeric: "Manrope_800ExtraBold",
};

export const shadows = {
  card: Platform.select({
    android: {
      filter: "drop-shadow(0px 4px 4px rgba(32,27,99,0.16))",
    },
    default: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.11,
      shadowRadius: 4,
    },
  }),
  stacked: Platform.select({
    android: {
      filter: "drop-shadow(0px 2px 2px rgba(32,27,99,0.08))",
    },
    default: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.055,
      shadowRadius: 2,
    },
  }),
  soft: Platform.select({
    android: {
      filter: "drop-shadow(0px 4px 4px rgba(32,27,99,0.16))",
    },
    default: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.11,
      shadowRadius: 4,
    },
  }),
};

export const gradients = {
  indigoStart: "rgba(55,48,163,0.98)",
  indigoEnd: "rgba(36,24,95,0.98)",
  lavenderGlow: "rgba(221,214,254,0.6)",
  peachGlow: "rgba(253,186,155,0.26)",
};
