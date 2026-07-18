import { Divider, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  monospacedDigit,
  opacity,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { useWindowDimensions } from "react-native";

import { iosBrand } from "@/src/theme/iosBrand";

function BalanceMetric({
  label,
  amount,
  direction,
}: {
  label: string;
  amount: string;
  direction: "positive" | "negative";
}) {
  const color = direction === "positive" ? iosBrand.positiveOnBranded : iosBrand.negativeOnBranded;
  return (
    <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}>
      <HStack spacing={5}>
        <Image
          systemName={direction === "positive" ? "arrow.down.left" : "arrow.up.right"}
          modifiers={[font({ textStyle: "caption", weight: "bold" }), foregroundStyle(color)]}
        />
        <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), foregroundStyle(iosBrand.onBrandedBackground)]}>
          {label}
        </Text>
      </HStack>
      <Text modifiers={[font({ textStyle: "headline", weight: "bold" }), foregroundStyle(color), monospacedDigit()]}>
        {amount}
      </Text>
    </VStack>
  );
}

export function DebtulatorBalanceHero({
  greeting,
  netAmount,
  owedToUser,
  owedByUser,
}: {
  greeting: string;
  netAmount: string;
  owedToUser: string;
  owedByUser: string;
}) {
  const { fontScale, width } = useWindowDimensions();
  const stackMetrics = fontScale >= 1.6 || width < 390;
  const metrics = (
    <>
      <BalanceMetric label="Owed to you" amount={owedToUser} direction="positive" />
      {stackMetrics ? null : <Spacer />}
      <BalanceMetric label="You owe" amount={owedByUser} direction="negative" />
    </>
  );

  return (
    <VStack
      alignment="leading"
      spacing={14}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: "leading" }),
        padding({ all: 18 }),
        background(iosBrand.brandedBackground),
        clipShape("roundedRectangle", 24),
        listRowBackground("clear"),
        listRowSeparator("hidden"),
        listRowInsets({ top: 8, leading: 16, bottom: 8, trailing: 16 }),
        accessibilityElement("combine"),
        accessibilityLabel(`${greeting}. Net position ${netAmount}. Owed to you ${owedToUser}. You owe ${owedByUser}.`),
      ]}
    >
      <HStack spacing={8}>
        <Image
          systemName="sum"
          modifiers={[
            font({ textStyle: "headline", weight: "bold" }),
            foregroundStyle(iosBrand.onBrandedBackground),
          ]}
        />
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), foregroundStyle(iosBrand.onBrandedBackground)]}>
          {greeting}
        </Text>
      </HStack>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle(iosBrand.onBrandedBackground), opacity(0.82)]}>
          Net position
        </Text>
        <Text modifiers={[font({ textStyle: "largeTitle", weight: "heavy" }), foregroundStyle(iosBrand.onBrandedBackground), monospacedDigit()]}>
          {netAmount}
        </Text>
      </VStack>
      <Divider modifiers={[opacity(0.3)]} />
      {stackMetrics ? (
        <VStack alignment="leading" spacing={12}>{metrics}</VStack>
      ) : (
        <HStack spacing={18}>{metrics}</HStack>
      )}
    </VStack>
  );
}
