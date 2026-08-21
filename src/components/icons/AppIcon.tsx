import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ColorValue } from "react-native";

import { colors } from "@/src/theme";

type Props = {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  color?: ColorValue;
};

export function AppIcon({ name, size = 24, color = colors.text }: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
