import {
  debtulatorLightRoles,
  debtulatorPalette,
  type BrandColorRoles,
} from "@/src/theme/brand";

// Non-iOS fallback keeps Expo Router's static route discovery safe. iOS resolves
// iosBrand.ios.ts and receives fully dynamic appearance-aware colors.
export const iosBrand: BrandColorRoles = debtulatorLightRoles;
export const IOS_APP_TINT = debtulatorPalette.primary;
