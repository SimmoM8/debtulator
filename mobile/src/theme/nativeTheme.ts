import { brand } from "./brand";

export const nativeTheme = {
  seedColor: brand.colors.primary,

  onBrand: {
    selectedContainer: "#FFFFFF",
    selectedContent: brand.colors.primary,

    unselectedContainer: "transparent",
    unselectedContent: "#FFFFFF",

    outline: "rgba(255, 255, 255, 0.42)",
  },
} as const;
