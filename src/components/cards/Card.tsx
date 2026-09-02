import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { componentTokens, useAppTheme } from "@/src/theme";

type CardProps = PropsWithChildren<{
  variant?: "default" | "onBrand";
}>;

export function Card({ variant = "default", children }: CardProps) {
  const theme = useAppTheme();

  const isOnBrand = variant === "onBrand";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isOnBrand
            ? theme.colors.onBrandSurface
            : theme.colors.surfaceContainer,

          borderColor: isOnBrand
            ? theme.colors.onBrandSurfaceBorder
            : theme.colors.outline,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: componentTokens.card.radius,
  },
});
