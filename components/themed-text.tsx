import { StyleSheet, Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { typography } from "@/src/constants/design";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return (
    <Text
      style={[
        { color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: typography.size.xl,
    lineHeight: typography.line.h2,
  },
  defaultSemiBold: {
    fontSize: typography.size.xl,
    lineHeight: typography.line.h2,
    fontWeight: "600",
  },
  title: {
    fontSize: typography.size.displayLg,
    fontWeight: "bold",
    lineHeight: typography.line.displayLg,
  },
  subtitle: {
    fontSize: typography.size.h3,
    fontWeight: "bold",
  },
  link: {
    lineHeight: typography.line.displaySm,
    fontSize: typography.size.xl,
    color: "#3730A3",
  },
});
