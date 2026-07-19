import { Stack } from "expo-router";
import type { ReactNode } from "react";

import { iosBrand } from "@/src/theme/iosBrand";

// iOS 26 makes a large title invisible when the compact header background is
// set. Keep the two native appearances separate: compact bars receive a subtle
// lavender wash, while large headers carry the brand through their title/tint.
export const IOS_COMPACT_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: iosBrand.navigationBackground },
  headerTintColor: iosBrand.appTint,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
};

export const IOS_LARGE_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: "transparent" },
  headerTintColor: iosBrand.appTint,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
};

export function NativeLargePageTitle({ children }: { children: ReactNode }) {
  return (
    <Stack.Title large largeStyle={{ color: iosBrand.appTint }}>
      {children}
    </Stack.Title>
  );
}
