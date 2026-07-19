import { Stack } from "expo-router";
import type { ReactNode } from "react";

import { iosBrand } from "@/src/theme/iosBrand";

// Keep native navigation behavior while giving both compact and expanded page
// headers the same subtle, appearance-aware Debtulator wash.
export const IOS_COMPACT_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: iosBrand.navigationBackground },
  headerTintColor: iosBrand.appTint,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
};

export const IOS_LARGE_HEADER_OPTIONS = {
  headerStyle: { backgroundColor: iosBrand.navigationBackground },
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
