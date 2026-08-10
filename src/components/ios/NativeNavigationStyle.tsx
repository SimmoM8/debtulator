import { iosBrand } from "@/src/theme/iosBrand";
import { PlatformColor } from "react-native";

const IOS_SYSTEM_HEADER_FOREGROUND = PlatformColor("label");

export const IOS_COMPACT_HEADER_OPTIONS = {
  headerTintColor: IOS_SYSTEM_HEADER_FOREGROUND,
  headerTitleStyle: { color: IOS_SYSTEM_HEADER_FOREGROUND },
  statusBarStyle: "auto" as const,
  headerShadowVisible: false,
};

const IOS_NATIVE_LARGE_HEADER_OPTIONS = {
  headerLargeTitleEnabled: true,
  headerTintColor: IOS_SYSTEM_HEADER_FOREGROUND,
  headerTitleStyle: { color: IOS_SYSTEM_HEADER_FOREGROUND },
  statusBarStyle: "auto" as const,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
};

export const IOS_LARGE_TITLE_STYLE = {
  color: iosBrand.onBrandedBackground,
};

export const IOS_LARGE_HEADER_OPTIONS = {
  ...IOS_NATIVE_LARGE_HEADER_OPTIONS,
  headerLargeStyle: {
    backgroundColor: iosBrand.navigationScrollEdgeBackground,
  },
  headerLargeTitleStyle: IOS_LARGE_TITLE_STYLE,
};
