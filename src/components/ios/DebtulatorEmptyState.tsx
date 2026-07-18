import { Button, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  multilineTextAlignment,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

import { iosBrand } from "@/src/theme/iosBrand";

export function DebtulatorEmptyState({
  title,
  description,
  systemImage = "sparkles",
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  systemImage?: SFSymbol;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <VStack
      spacing={12}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: "center" }),
        padding({ vertical: 28, horizontal: 20 }),
        listRowBackground("clear"),
        listRowSeparator("hidden"),
        listRowInsets({ top: 4, leading: 16, bottom: 4, trailing: 16 }),
      ]}
    >
      <Image
        systemName={systemImage}
        modifiers={[
          font({ textStyle: "largeTitle", weight: "semibold" }),
          foregroundStyle(iosBrand.primaryAction),
          frame({ width: 76, height: 76 }),
          background(iosBrand.selectionBackground),
          clipShape("circle"),
        ]}
      />
      <Text modifiers={[font({ textStyle: "title3", weight: "bold" }), multilineTextAlignment("center")]}>
        {title}
      </Text>
      <Text modifiers={[font({ textStyle: "body" }), foregroundStyle({ type: "hierarchical", style: "secondary" }), multilineTextAlignment("center")]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} modifiers={[buttonStyle("borderedProminent")]} />
      ) : null}
    </VStack>
  );
}
