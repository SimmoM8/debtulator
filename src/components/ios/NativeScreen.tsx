import { Group, Host } from "@expo/ui/swift-ui";
import React from "react";

export const IOS_ACCENT = "#5B4FD8";

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
