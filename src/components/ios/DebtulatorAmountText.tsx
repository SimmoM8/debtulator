import { Text } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  monospacedDigit,
} from "@expo/ui/swift-ui/modifiers";

import { iosBrand } from "@/src/theme/iosBrand";

export type DebtulatorAmountTone =
  | "brand"
  | "positive"
  | "negative"
  | "neutral"
  | "onBrand";

function colorForTone(tone: DebtulatorAmountTone) {
  switch (tone) {
    case "positive":
      return iosBrand.owedToUser;
    case "negative":
      return iosBrand.owedByUser;
    case "neutral":
      return iosBrand.neutralBalance;
    case "onBrand":
      return iosBrand.onBrandedBackground;
    default:
      return iosBrand.primaryAction;
  }
}

export function DebtulatorAmountText({
  children,
  tone = "brand",
  textStyle = "title3",
  weight = "bold",
}: {
  children: string;
  tone?: DebtulatorAmountTone;
  textStyle?: "body" | "headline" | "title3" | "title2" | "title" | "largeTitle";
  weight?: "medium" | "semibold" | "bold" | "heavy";
}) {
  return (
    <Text
      modifiers={[
        font({ textStyle, weight }),
        foregroundStyle(colorForTone(tone)),
        monospacedDigit(),
      ]}
    >
      {children}
    </Text>
  );
}
