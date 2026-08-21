import type { TextStyle } from "react-native";

export const textStyles = {
  largeTitle: {
    fontSize: 34,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  headline: {
    fontSize: 17,
    fontWeight: "600",
  },
  body: {
    fontSize: 17,
    fontWeight: "400",
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
  },
} satisfies Record<string, TextStyle>;