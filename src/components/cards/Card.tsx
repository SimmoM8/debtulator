import type { PropsWithChildren } from "react";
import { View } from "react-native";

import {
  getContentSurfaceStyle,
  useAppTheme,
  type ContentSurfaceVariant,
} from "@/src/theme";

type CardProps = PropsWithChildren<{
  variant?: ContentSurfaceVariant;
}>;

export function Card({ variant = "default", children }: CardProps) {
  const theme = useAppTheme();

  return (
    <View style={getContentSurfaceStyle(theme.colors, variant)}>
      {children}
    </View>
  );
}
