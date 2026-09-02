import { StyleSheet, Text, View } from "react-native";

import { componentTokens, useAppTheme } from "@/src/theme";

type MemberAvatarProps = {
  displayName: string;
  size?: number;
  variant?: "default" | "onBrand";
};

export function MemberAvatar({
  displayName,
  size = componentTokens.avatar.listSize,
  variant = "default",
}: MemberAvatarProps) {
  const theme = useAppTheme();

  const isOnBrand = variant === "onBrand";

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
      <Text
        style={[
          styles.initials,
          {
            color: isOnBrand
              ? theme.colors.onHeroBackground
              : theme.colors.onControlContainer,

            fontSize: size * 0.38,
          },
        ]}
      >
        {getInitials(displayName)}
      </Text>
    </View>
  );
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  const initials = parts
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase();

  return initials || "?";
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },

  initials: {
    fontWeight: "500",
  },
});
