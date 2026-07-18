import { DynamicColorIOS, type ColorValue } from "react-native";

import {
  debtulatorDarkRoles,
  debtulatorHighContrastDarkRoles,
  debtulatorHighContrastLightRoles,
  debtulatorLightRoles,
  type BrandColorRoles,
} from "@/src/theme/brand";

function dynamicRole(role: keyof BrandColorRoles): ColorValue {
  return DynamicColorIOS({
    light: debtulatorLightRoles[role],
    dark: debtulatorDarkRoles[role],
    highContrastLight: debtulatorHighContrastLightRoles[role],
    highContrastDark: debtulatorHighContrastDarkRoles[role],
  });
}

export const iosBrand: BrandColorRoles<ColorValue> = {
  appTint: dynamicRole("appTint"),
  primaryAction: dynamicRole("primaryAction"),
  prominentAction: dynamicRole("prominentAction"),
  selection: dynamicRole("selection"),
  positive: dynamicRole("positive"),
  negative: dynamicRole("negative"),
  warning: dynamicRole("warning"),
  owedToUser: dynamicRole("owedToUser"),
  owedByUser: dynamicRole("owedByUser"),
  neutralBalance: dynamicRole("neutralBalance"),
  brandedBackground: dynamicRole("brandedBackground"),
  brandedSecondaryBackground: dynamicRole("brandedSecondaryBackground"),
  brandedIllustrationPrimary: dynamicRole("brandedIllustrationPrimary"),
  brandedIllustrationSecondary: dynamicRole("brandedIllustrationSecondary"),
  chartPrimary: dynamicRole("chartPrimary"),
  chartSecondary: dynamicRole("chartSecondary"),
  chartPositive: dynamicRole("chartPositive"),
  chartNegative: dynamicRole("chartNegative"),
  onBrandedBackground: dynamicRole("onBrandedBackground"),
  positiveBackground: dynamicRole("positiveBackground"),
  negativeBackground: dynamicRole("negativeBackground"),
  warningBackground: dynamicRole("warningBackground"),
  selectionBackground: dynamicRole("selectionBackground"),
};

export const IOS_APP_TINT = iosBrand.appTint;
