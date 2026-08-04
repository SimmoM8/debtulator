import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
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
  padding,
} from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

import { DebtulatorAmountText, type DebtulatorAmountTone } from "@/src/components/ios/DebtulatorAmountText";
import { DebtulatorAvatar } from "@/src/components/ios/DebtulatorAvatar";
import { DebtulatorStatusBadge, type DebtulatorStatusTone } from "@/src/components/ios/DebtulatorStatusBadge";
import { iosBrand } from "@/src/theme/iosBrand";

export function DebtulatorIdentitySummary({
  title,
  subtitle,
  amount,
  amountLabel,
  amountTone = "brand",
  badge,
  badgeTone = "brand",
  avatarName,
  systemImage,
}: {
  title: string;
  subtitle: string;
  amount?: string;
  amountLabel?: string;
  amountTone?: DebtulatorAmountTone;
  badge?: string;
  badgeTone?: DebtulatorStatusTone;
  avatarName?: string;
  systemImage?: SFSymbol;
}) {
  return (
    <VStack
      alignment="leading"
      spacing={12}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: "leading" }),
        padding({ all: 16 }),
        background(iosBrand.brandedSecondaryBackground),
        clipShape("roundedRectangle", 20),
        listRowBackground("clear"),
        listRowSeparator("hidden"),
        listRowInsets({ top: 6, leading: 16, bottom: 6, trailing: 16 }),
        accessibilityElement("combine"),
        accessibilityLabel([title, subtitle, amountLabel, amount, badge].filter(Boolean).join(", ")),
      ]}
    >
      <HStack spacing={12}>
        {avatarName ? <DebtulatorAvatar name={avatarName} size={52} /> : null}
        {systemImage ? (
          <Image
            systemName={systemImage}
            modifiers={[
              font({ textStyle: "title2", weight: "semibold" }),
              foregroundStyle(iosBrand.primaryAction),
              frame({ width: 52, height: 52 }),
              background(iosBrand.selectionBackground),
              clipShape("circle"),
            ]}
          />
        ) : null}
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ textStyle: "headline", weight: "bold" })]}>{title}</Text>
          <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>
            {subtitle}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
      {amount ? (
        <HStack>
          <VStack alignment="leading" spacing={2}>
            {amountLabel ? (
              <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>
                {amountLabel}
              </Text>
            ) : null}
            <DebtulatorAmountText tone={amountTone} textStyle="title2">{amount}</DebtulatorAmountText>
          </VStack>
          <Spacer />
          {badge ? <DebtulatorStatusBadge label={badge} tone={badgeTone} /> : null}
        </HStack>
      ) : badge ? (
        <DebtulatorStatusBadge label={badge} tone={badgeTone} />
      ) : null}
    </VStack>
  );
}
