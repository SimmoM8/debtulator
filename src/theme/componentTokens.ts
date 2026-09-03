import { brand } from "./brand";

export const componentTokens = {
  surface: {
    radius: brand.radius.large,
  },

  quickAction: {
    size: 50,
    iconSize: 21,
  },

  avatar: {
    listSize: 44,
    heroSize: 88,

    initialsScale: 0.38,
    iconScale: 0.42,
  },
} as const;
