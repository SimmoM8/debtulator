import { PlatformColor } from "react-native";

const IOS_COMPACT_HEADER_FOREGROUND = PlatformColor("label");

export const IOS_COMPACT_HEADER_OPTIONS = {
  headerTintColor: IOS_COMPACT_HEADER_FOREGROUND,
  headerTitleStyle: { color: IOS_COMPACT_HEADER_FOREGROUND },
  statusBarStyle: "auto" as const,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
};

const IOS_NATIVE_LARGE_HEADER_OPTIONS = {
  headerLargeTitleEnabled: true,
  headerTitleStyle: { color: IOS_COMPACT_HEADER_FOREGROUND },
  headerTintColor: IOS_COMPACT_HEADER_FOREGROUND,
  statusBarStyle: "auto" as const,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
};

export const IOS_LARGE_HEADER_OPTIONS = {
  ...IOS_NATIVE_LARGE_HEADER_OPTIONS,
  headerLargeTitleStyle: { color: IOS_COMPACT_HEADER_FOREGROUND },
};
