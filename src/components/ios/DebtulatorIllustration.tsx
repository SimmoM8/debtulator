import { Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  aspectRatio,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  multilineTextAlignment,
  padding,
  resizable,
} from "@expo/ui/swift-ui/modifiers";
import { useAssets } from "expo-asset";

import { iosBrand } from "@/src/theme/iosBrand";

const orbitAsset = require("../../../assets/images/debtulator-orbit-native.png");
const shieldAsset = require("../../../assets/images/debtulator-shield-native.png");

export type DebtulatorIllustrationVariant = "orbit" | "shield";

export function DebtulatorIllustration({
  variant,
  height = 116,
}: {
  variant: DebtulatorIllustrationVariant;
  height?: number;
}) {
  const [assets] = useAssets(variant === "orbit" ? orbitAsset : shieldAsset);
  const uri = assets?.[0]?.localUri;

  if (!uri) {
    return (
      <Image
        systemName={variant === "orbit" ? "circle.hexagongrid.fill" : "checkmark.shield.fill"}
        modifiers={[
          font({ textStyle: "largeTitle", weight: "semibold" }),
          foregroundStyle(iosBrand.primaryAction),
          frame({ height, maxWidth: Infinity }),
        ]}
      />
    );
  }

  return (
    <Image
      uiImage={uri}
      modifiers={[
        resizable(),
        aspectRatio({ contentMode: "fit" }),
        frame({ height, maxWidth: Infinity }),
      ]}
    />
  );
}

export function DebtulatorIllustratedHeader({
  variant,
  title,
  description,
}: {
  variant: DebtulatorIllustrationVariant;
  title: string;
  description: string;
}) {
  return (
    <VStack
      spacing={10}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: "center" }),
        padding({ vertical: 18, horizontal: 18 }),
        background(iosBrand.brandedSecondaryBackground),
        clipShape("roundedRectangle", 22),
        listRowBackground("clear"),
        listRowSeparator("hidden"),
        listRowInsets({ top: 6, leading: 16, bottom: 6, trailing: 16 }),
        accessibilityElement("combine"),
        accessibilityLabel(`${title}. ${description}`),
      ]}
    >
      <DebtulatorIllustration variant={variant} />
      <Text modifiers={[font({ textStyle: "title2", weight: "bold" }), multilineTextAlignment("center")]}>
        {title}
      </Text>
      <Text modifiers={[font({ textStyle: "body" }), foregroundStyle({ type: "hierarchical", style: "secondary" }), multilineTextAlignment("center")]}>
        {description}
      </Text>
    </VStack>
  );
}
