import { Group, Host } from "@expo/ui/swift-ui";
import React from "react";

import { IOS_ACCENT } from "@/src/components/ios/NativeScreen";

export function NativeInlineHost({ children }: { children: React.ReactNode }) {
  return (
    <Host seedColor={IOS_ACCENT} style={{ flex: 0 }}>
      <Group>{children}</Group>
    </Host>
  );
}
