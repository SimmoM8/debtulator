import { brand } from "./brand";

export const componentTokens = {
  surface: {
    radius: brand.radius.large,
  },

  button: {
    height: 52,
    radius: brand.radius.medium,
  },

  quickAction: {
    size: 44,
    iconSize: 19,
  },

  avatar: {
    listSize: 44,
    heroSize: 80,
    summarySize: 40,
    initialsScale: 0.38,
    iconScale: 0.42,
  },
} as const;
