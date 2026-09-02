import { brand } from "./brand";

export const componentTokens = {
  card: {
    radius: brand.radius.large,
  },

  quickAction: {
    size: 50,
    iconSize: 21,
  },

  avatar: {
    listSize: 44,
    heroSize: 88,
  },
} as const;
