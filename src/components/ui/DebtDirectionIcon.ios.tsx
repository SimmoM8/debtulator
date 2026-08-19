import { SymbolView } from "expo-symbols";

import { palette } from "@/src/constants/design";

export function DebtDirectionIcon({
  direction,
  size = 20,
}: {
  direction: "owing" | "owed";
  size?: number;
}) {
  return (
    <SymbolView
      name={direction === "owing" ? "arrow.up.right" : "arrow.down.left"}
      tintColor={direction === "owing" ? palette.negative : palette.positive}
      weight="semibold"
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
