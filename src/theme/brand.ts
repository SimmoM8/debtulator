export const debtulatorPalette = {
  primary: "#3730A3",
  primaryDeep: "#24185F",
  lavender: "#DDD6FE",
  lavenderMist: "#F6F3FF",
  peach: "#FDBA9B",
  mint: "#2FBF8F",
  amber: "#F59E0B",
  coral: "#FF6B6B",
} as const;

export type BrandColorRoles<T = string> = {
  appTint: T;
  primaryAction: T;
  prominentAction: T;
  selection: T;
  positive: T;
  negative: T;
  warning: T;
  owedToUser: T;
  owedByUser: T;
  neutralBalance: T;
  brandedBackground: T;
  brandedSecondaryBackground: T;
  brandedIllustrationPrimary: T;
  brandedIllustrationSecondary: T;
  chartPrimary: T;
  chartSecondary: T;
  chartPositive: T;
  chartNegative: T;
  onBrandedBackground: T;
  positiveBackground: T;
  negativeBackground: T;
  warningBackground: T;
  selectionBackground: T;
};

export const debtulatorLightRoles: BrandColorRoles = {
  appTint: debtulatorPalette.primary,
  primaryAction: debtulatorPalette.primary,
  prominentAction: debtulatorPalette.primaryDeep,
  selection: debtulatorPalette.primary,
  positive: "#167858",
  negative: "#C83D48",
  warning: "#9A5900",
  owedToUser: "#167858",
  owedByUser: "#C83D48",
  neutralBalance: "#667085",
  brandedBackground: debtulatorPalette.primary,
  brandedSecondaryBackground: debtulatorPalette.lavenderMist,
  brandedIllustrationPrimary: debtulatorPalette.primary,
  brandedIllustrationSecondary: debtulatorPalette.peach,
  chartPrimary: debtulatorPalette.primary,
  chartSecondary: "#7C6EE6",
  chartPositive: "#1C8B67",
  chartNegative: "#D14B55",
  onBrandedBackground: "#FFFFFF",
  positiveBackground: "#E8F8F1",
  negativeBackground: "#FFF0F0",
  warningBackground: "#FFF7E7",
  selectionBackground: debtulatorPalette.lavenderMist,
};

export const debtulatorDarkRoles: BrandColorRoles = {
  appTint: "#AFA7FF",
  primaryAction: "#AFA7FF",
  prominentAction: "#7468EF",
  selection: "#AFA7FF",
  positive: "#55D8A8",
  negative: "#FF8A91",
  warning: "#FFC05A",
  owedToUser: "#55D8A8",
  owedByUser: "#FF8A91",
  neutralBalance: "#AEB4C1",
  brandedBackground: "#2D2673",
  brandedSecondaryBackground: "#1D1A2D",
  brandedIllustrationPrimary: "#AFA7FF",
  brandedIllustrationSecondary: "#FFC1A5",
  chartPrimary: "#AFA7FF",
  chartSecondary: "#FDBA9B",
  chartPositive: "#55D8A8",
  chartNegative: "#FF8A91",
  onBrandedBackground: "#FFFFFF",
  positiveBackground: "#142D24",
  negativeBackground: "#341C22",
  warningBackground: "#352711",
  selectionBackground: "#25213D",
};

export const debtulatorHighContrastLightRoles: BrandColorRoles = {
  ...debtulatorLightRoles,
  appTint: debtulatorPalette.primaryDeep,
  primaryAction: debtulatorPalette.primaryDeep,
  positive: "#005C3E",
  negative: "#A51128",
  warning: "#714000",
  owedToUser: "#005C3E",
  owedByUser: "#A51128",
  neutralBalance: "#394150",
};

export const debtulatorHighContrastDarkRoles: BrandColorRoles = {
  ...debtulatorDarkRoles,
  appTint: "#D0CBFF",
  primaryAction: "#D0CBFF",
  positive: "#73F0BF",
  negative: "#FFADB2",
  warning: "#FFD37D",
  owedToUser: "#73F0BF",
  owedByUser: "#FFADB2",
  neutralBalance: "#D3D7E0",
};

export function debtulatorRolesForScheme(
  scheme: "light" | "dark" | "unspecified" | null | undefined,
) {
  return scheme === "dark" ? debtulatorDarkRoles : debtulatorLightRoles;
}
