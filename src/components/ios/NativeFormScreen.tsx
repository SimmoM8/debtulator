import { Form } from "@expo/ui/swift-ui";
import React from "react";

import { NativeScreen } from "@/src/components/ios/NativeScreen";

export function NativeFormScreen({ children }: { children: React.ReactNode }) {
  return (
    <NativeScreen>
      <Form>{children}</Form>
    </NativeScreen>
  );
}
