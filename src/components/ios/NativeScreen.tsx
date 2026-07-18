import { Group, Host } from "@expo/ui/swift-ui";
import React from "react";

import { IOS_APP_TINT } from "@/src/theme/iosBrand";

export const IOS_ACCENT = IOS_APP_TINT;

/**
 * The single UIKit-to-SwiftUI boundary for a complete iOS screen.
 * Navigation bars and toolbars remain owned by Expo Router's native Stack.
 */
export function NativeScreen({ children }: { children: React.ReactNode }) {
  return (
    <Host
      seedColor={IOS_ACCENT}
      style={{ flex: 1 }}
      useViewportSizeMeasurement
    >
      <Group>{children}</Group>
    </Host>
  );
}
