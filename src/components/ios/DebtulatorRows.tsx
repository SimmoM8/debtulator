import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
} from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

import { DebtulatorAvatar } from "@/src/components/ios/DebtulatorAvatar";
import type { DebtulatorAmountTone } from "@/src/components/ios/DebtulatorAmountText";
import { DebtulatorStatusBadge, type DebtulatorStatusTone } from "@/src/components/ios/DebtulatorStatusBadge";
import { iosBrand } from "@/src/theme/iosBrand";

function toneColor(tone: DebtulatorAmountTone) {
  if (tone === "positive") return iosBrand.owedToUser;
  if (tone === "negative") return iosBrand.owedByUser;
  if (tone === "neutral") return iosBrand.neutralBalance;
  return iosBrand.primaryAction;
}

function BrandedRowButton({
  label,
  hint,
  onPress,
  children,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  children: React.ReactElement;
}) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle("plain"),
        frame({ minHeight: 52, maxWidth: Infinity, alignment: "leading" }),
        accessibilityLabel(label),
        accessibilityHint(hint),
      ]}
    >
      {children}
    </Button>
  );
}

function Chevron() {
  return (
    <Image
      systemName="chevron.right"
      modifiers={[
        font({ textStyle: "footnote", weight: "semibold" }),
        foregroundStyle({ type: "hierarchical", style: "tertiary" }),
      ]}
    />
  );
}

export function DebtulatorMemberRow({
  name,
  subtitle,
  amount,
  balanceLabel,
  tone,
  linked,
  onPress,
}: {
  name: string;
  subtitle: string;
  amount: string;
  balanceLabel: string;
  tone: DebtulatorAmountTone;
  linked: boolean;
  onPress: () => void;
}) {
  return (
    <BrandedRowButton label={`${name}, ${balanceLabel}, ${amount}${linked ? ", linked" : ""}`} hint={`Opens ${name}'s member details`} onPress={onPress}>
      <HStack spacing={12}>
        <DebtulatorAvatar name={name} />
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ textStyle: "body", weight: "semibold" })]}>{name}</Text>
          <HStack spacing={5}>
            {linked ? <Image systemName="link" modifiers={[font({ textStyle: "caption" }), foregroundStyle(iosBrand.primaryAction)]} /> : null}
            <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>
              {subtitle}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text modifiers={[font({ textStyle: "body", weight: "bold" }), foregroundStyle(toneColor(tone)), monospacedDigit()]}>{amount}</Text>
          <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), foregroundStyle(toneColor(tone))]}>{balanceLabel}</Text>
        </VStack>
        <Chevron />
      </HStack>
    </BrandedRowButton>
  );
}

export function DebtulatorDebtRow({
  title,
  subtitle,
  amount,
  direction,
  status,
  onPress,
}: {
  title: string;
  subtitle: string;
  amount: string;
  direction: "i_owe_them" | "they_owe_me";
  status: string;
  onPress: () => void;
}) {
  const positive = direction === "they_owe_me";
  const tone: DebtulatorAmountTone = positive ? "positive" : "negative";
  const statusTone: DebtulatorStatusTone = status === "active" ? (positive ? "positive" : "negative") : "neutral";
  const directionLabel = positive ? "Owed to you" : "You owe";
  return (
    <BrandedRowButton label={`${title}, ${subtitle}, ${directionLabel}, ${amount}, ${status}`} hint={`Opens details for ${title}`} onPress={onPress}>
      <HStack spacing={12}>
        <Image
          systemName={positive ? "arrow.down.left.circle.fill" : "arrow.up.right.circle.fill"}
          modifiers={[font({ textStyle: "title2" }), foregroundStyle(toneColor(tone)), frame({ minWidth: 32 })]}
        />
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ textStyle: "body", weight: "semibold" })]}>{title}</Text>
          <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>{subtitle}</Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={4}>
          <Text modifiers={[font({ textStyle: "body", weight: "bold" }), foregroundStyle(toneColor(tone)), monospacedDigit()]}>{amount}</Text>
          <DebtulatorStatusBadge label={directionLabel} tone={statusTone} />
        </VStack>
        <Chevron />
      </HStack>
    </BrandedRowButton>
  );
}

export function DebtulatorGroupRow({
  name,
  subtitle,
  amount,
  balanceLabel,
  tone,
  memberCount,
  onPress,
}: {
  name: string;
  subtitle: string;
  amount: string;
  balanceLabel: string;
  tone: DebtulatorAmountTone;
  memberCount: number;
  onPress: () => void;
}) {
  return (
    <BrandedRowButton label={`${name}, ${subtitle}, ${memberCount} members, ${balanceLabel}, ${amount}`} hint={`Opens ${name} group details`} onPress={onPress}>
      <HStack spacing={12}>
        <DebtulatorAvatar name={name} />
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ textStyle: "body", weight: "semibold" })]}>{name}</Text>
          <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>{subtitle}</Text>
          <HStack spacing={4}>
            <Image systemName="person.2.fill" modifiers={[font({ textStyle: "caption2" }), foregroundStyle(iosBrand.primaryAction)]} />
            <Text modifiers={[font({ textStyle: "caption" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text modifiers={[font({ textStyle: "body", weight: "bold" }), foregroundStyle(toneColor(tone)), monospacedDigit()]}>{amount}</Text>
          <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), foregroundStyle(toneColor(tone))]}>{balanceLabel}</Text>
        </VStack>
        <Chevron />
      </HStack>
    </BrandedRowButton>
  );
}

export function DebtulatorFinancialRow({
  title,
  subtitle,
  amount,
  tone,
  systemImage,
  onPress,
}: {
  title: string;
  subtitle: string;
  amount: string;
  tone: DebtulatorAmountTone;
  systemImage: SFSymbol;
  onPress: () => void;
}) {
  return (
    <BrandedRowButton label={`${title}, ${subtitle}, ${amount}`} hint={`Opens ${title}`} onPress={onPress}>
      <HStack spacing={12}>
        <Image systemName={systemImage} modifiers={[font({ textStyle: "title3" }), foregroundStyle(toneColor(tone)), frame({ minWidth: 28 })]} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: "body", weight: "semibold" })]}>{title}</Text>
          <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>{subtitle}</Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ textStyle: "body", weight: "bold" }), foregroundStyle(toneColor(tone)), monospacedDigit()]}>{amount}</Text>
        <Chevron />
      </HStack>
    </BrandedRowButton>
  );
}
