import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

import { StyleSheet, Text, View } from "react-native";

import { componentTokens, textStyles, useAppTheme } from "@/src/theme";

export type AvatarIcon = ComponentProps<typeof SymbolView>["name"];

type AvatarProps = {
  size?: number;
  variant?: "default" | "onBrand";
} & (
  | {
      initials: string;
      icon?: never;
    }
  | {
      initials?: never;
      icon: AvatarIcon;
    }
);

export function Avatar({
  size = componentTokens.avatar.listSize,
  variant = "default",
  initials,
  icon,
}: AvatarProps) {
  const theme = useAppTheme();

  const isOnBrand = variant === "onBrand";

  const contentColor = isOnBrand
    ? theme.colors.onHeroBackground
    : theme.colors.onControlContainer;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,

          borderRadius: size / 2,

          backgroundColor: isOnBrand
            ? theme.colors.onBrandSurface
            : theme.colors.controlContainer,

          borderColor: isOnBrand
            ? theme.colors.onBrandSurfaceBorder
            : theme.colors.outline,
        },
      ]}
    >
      {icon ? (
        <SymbolView
          name={icon}
          tintColor={contentColor}
          size={size * componentTokens.avatar.iconScale}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              color: contentColor,

              fontSize: size * componentTokens.avatar.initialsScale,
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",

    borderWidth: StyleSheet.hairlineWidth,
  },

  initials: {
    fontWeight: textStyles.headline.fontWeight,
  },
});
