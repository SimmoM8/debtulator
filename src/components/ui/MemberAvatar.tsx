import BoringAvatar from "boring-avatars";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { G, Mask, Path, Rect } from "react-native-svg";

import { developerConfig } from "@/src/config/developerConfig";
import { palette } from "@/src/constants/design";
import { initials } from "@/src/utils/text";

const avatarColors = [
  palette.brand,
  palette.peach,
  palette.lavender,
];

type MemberAvatarProps = {
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  initialsTextStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function MemberAvatar({
  name,
  size = 32,
  style,
  initialsTextStyle,
  accessibilityLabel,
}: MemberAvatarProps) {
  if (!developerConfig.memberProfilePictures.useBoringAvatars) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
        style={[styles.shell, { width: size, height: size, borderRadius: size / 2 }, style]}
      >
        <Text style={initialsTextStyle}>{initials(name)}</Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
      style={[styles.shell, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      {Platform.OS === "web" ? (
        <BoringAvatar
          name={name}
          variant="marble"
          size={size}
          colors={avatarColors}
        />
      ) : (
        <NativeBoringAvatar name={name} size={size} />
      )}
    </View>
  );
}

function NativeBoringAvatar({ name, size }: { name: string; size: number }) {
  const hash = hashCode(name);
  const shapes = Array.from({ length: 3 }, (_, index) => ({
    color: pickColor(hash + index),
    translateX: marbleUnit(hash * (index + 1), 8, 1),
    translateY: marbleUnit(hash * (index + 1), 8, 2),
    scale: 1.2 + marbleUnit(hash * (index + 1), 4) / 10,
    rotate: marbleUnit(hash * (index + 1), 360, 1),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Mask id={`member-avatar-mask-${hash}`} x="0" y="0" width="80" height="80">
        <Rect width="80" height="80" rx="160" fill="#FFFFFF" />
      </Mask>
      <G mask={`url(#member-avatar-mask-${hash})`}>
        <Rect width="80" height="80" fill={shapes[0].color} />
        <Path
          d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
          fill={shapes[1].color}
          opacity="0.9"
          transform={`translate(${shapes[1].translateX} ${shapes[1].translateY}) rotate(${shapes[1].rotate} 40 40) scale(${shapes[2].scale})`}
        />
        <Path
          d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z"
          fill={shapes[2].color}
          opacity="0.72"
          transform={`translate(${shapes[2].translateX} ${shapes[2].translateY}) rotate(${shapes[2].rotate} 40 40) scale(${shapes[2].scale})`}
        />
      </G>
    </Svg>
  );
}

function marbleUnit(value: number, range: number, index?: number) {
  const unit = value % range;
  return index && isEvenDigit(value, index) ? -unit : unit;
}

function isEvenDigit(value: number, position: number) {
  return digit(value, position) % 2 === 0;
}

function digit(value: number, position: number) {
  return Math.floor(value / Math.pow(10, position)) % 10;
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash || 1);
}

function pickColor(value: number) {
  return avatarColors[value % avatarColors.length];
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
