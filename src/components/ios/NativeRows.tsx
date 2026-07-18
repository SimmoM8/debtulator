import {
  Button,
  HStack,
  Image,
  Label,
  LabeledContent,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

export function NativeNavigationRow({
  title,
  subtitle,
  value,
  systemImage,
  onPress,
  hint,
}: {
  title: string;
  subtitle?: string | null;
  value?: string | null;
  systemImage?: SFSymbol;
  onPress: () => void;
  hint?: string;
}) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle("plain"),
        frame({ minHeight: 44, maxWidth: Infinity, alignment: "leading" }),
        accessibilityLabel(
          [title, subtitle, value].filter(Boolean).join(", "),
        ),
        ...(hint ? [accessibilityHint(hint)] : []),
      ]}
    >
      <HStack spacing={12}>
        {systemImage ? (
          <Image
            systemName={systemImage}
            modifiers={[
              font({ textStyle: "body" }),
              foregroundStyle("accentColor"),
              frame({ minWidth: 24 }),
            ]}
          />
        ) : null}
        <VStack alignment="leading" spacing={2}>
          <Text
            modifiers={[
              font({ textStyle: "body" }),
              foregroundStyle({ type: "hierarchical", style: "primary" }),
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              modifiers={[
                font({ textStyle: "subheadline" }),
                foregroundStyle({
                  type: "hierarchical",
                  style: "secondary",
                }),
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        <Spacer />
        {value ? (
          <Text
            modifiers={[
              font({ textStyle: "body" }),
              foregroundStyle({
                type: "hierarchical",
                style: "secondary",
              }),
            ]}
          >
            {value}
          </Text>
        ) : null}
        <Image
          systemName="chevron.right"
          modifiers={[
            font({ textStyle: "footnote", weight: "semibold" }),
            foregroundStyle({ type: "hierarchical", style: "tertiary" }),
          ]}
        />
      </HStack>
    </Button>
  );
}

export function NativeInfoRow({
  label,
  value,
  systemImage,
}: {
  label: string;
  value: string;
  systemImage?: SFSymbol;
}) {
  return (
    <LabeledContent
      label={
        systemImage ? <Label title={label} systemImage={systemImage} /> : label
      }
    >
      <Text
        modifiers={[
          font({ textStyle: "body" }),
          foregroundStyle({ type: "hierarchical", style: "secondary" }),
          monospacedDigit(),
        ]}
      >
        {value}
      </Text>
    </LabeledContent>
  );
}

export function NativeBodyCopy({ children }: { children: string }) {
  return (
    <Text
      modifiers={[
        font({ textStyle: "body" }),
        foregroundStyle({ type: "hierarchical", style: "secondary" }),
        padding({ vertical: 4 }),
      ]}
    >
      {children}
    </Text>
  );
}

export function NativeStatusText({
  children,
  destructive = false,
}: {
  children: string;
  destructive?: boolean;
}) {
  return (
    <Text
      modifiers={[
        font({ textStyle: "subheadline", weight: "medium" }),
        foregroundStyle(
          destructive
            ? "red"
            : { type: "hierarchical", style: "secondary" },
        ),
      ]}
    >
      {children}
    </Text>
  );
}
