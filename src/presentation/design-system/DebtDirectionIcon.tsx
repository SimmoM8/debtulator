import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { palette } from "@/src/presentation/theme/design";

export function DebtDirectionIcon({
  direction,
  size = 20,
}: {
  direction: "owing" | "owed";
  size?: number;
}) {
  return (
    <MaterialIcons
      name={direction === "owing" ? "north-east" : "south-west"}
      size={size}
      color={direction === "owing" ? palette.negative : palette.positive}
    />
  );
}
