import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

export type QuickActionIcon = ComponentProps<typeof SymbolView>["name"];

export type QuickAction = {
  id: string;
  label: string;
  icon: QuickActionIcon;

  onPress: () => void;

  disabled?: boolean;
};
