import { ProgressView, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";

import { NativeScreen } from "@/src/components/ios/NativeScreen";

export function NativeLoadingState({ label = "Opening your ledger" }: { label?: string }) {
  return (
    <NativeScreen>
      <VStack spacing={12} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
        <ProgressView />
        <Text
          modifiers={[
            font({ textStyle: "body" }),
            foregroundStyle({ type: "hierarchical", style: "secondary" }),
          ]}
        >
          {label}
        </Text>
      </VStack>
    </NativeScreen>
  );
}
