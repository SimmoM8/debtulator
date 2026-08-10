import { List } from "@expo/ui/swift-ui";
import {
  listStyle,
  refreshable,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";

import { NativeScreen } from "@/src/components/ios/NativeScreen";

export function NativeListScreen({
  children,
  onRefresh,
  grouped = true,
}: {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  grouped?: boolean;
}) {
  return (
    <NativeScreen>
      <List
        modifiers={[
          listStyle(grouped ? "insetGrouped" : "plain"),
          scrollContentBackground("hidden"),
          ...(onRefresh ? [refreshable(onRefresh)] : []),
        ]}
      >
        {children}
      </List>
    </NativeScreen>
  );
}
