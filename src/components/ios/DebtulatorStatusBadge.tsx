import { HStack, Image, Text } from "@expo/ui/swift-ui";
import {
  background,
  clipShape,
  font,
  foregroundStyle,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

import { iosBrand } from "@/src/theme/iosBrand";

export type DebtulatorStatusTone = "brand" | "positive" | "negative" | "warning" | "neutral";

function colorsForTone(tone: DebtulatorStatusTone) {
  switch (tone) {
    case "positive":
      return { foreground: iosBrand.positive, background: iosBrand.positiveBackground };
    case "negative":
      return { foreground: iosBrand.negative, background: iosBrand.negativeBackground };
    case "warning":
      return { foreground: iosBrand.warning, background: iosBrand.warningBackground };
    case "neutral":
      return { foreground: iosBrand.neutralBalance, background: iosBrand.brandedSecondaryBackground };
    default:
      return { foreground: iosBrand.primaryAction, background: iosBrand.selectionBackground };
  }
}

export function DebtulatorStatusBadge({
  label,
  tone = "brand",
  systemImage,
}: {
  label: string;
  tone?: DebtulatorStatusTone;
  systemImage?: SFSymbol;
}) {
  const colors = colorsForTone(tone);
  return (
    <HStack
      spacing={4}
      modifiers={[
        padding({ horizontal: 8, vertical: 4 }),
        background(colors.background),
        clipShape("capsule"),
      ]}
    >
      {systemImage ? (
        <Image
          systemName={systemImage}
          modifiers={[
            font({ textStyle: "caption2", weight: "semibold" }),
            foregroundStyle(colors.foreground),
          ]}
        />
      ) : null}
      <Text
        modifiers={[
          font({ textStyle: "caption", weight: "semibold" }),
          foregroundStyle(colors.foreground),
        ]}
      >
        {label}
      </Text>
    </HStack>
  );
}
