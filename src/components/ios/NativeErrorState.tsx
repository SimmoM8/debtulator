import { Button, ContentUnavailableView, VStack } from "@expo/ui/swift-ui";
import { buttonStyle, controlSize, frame } from "@expo/ui/swift-ui/modifiers";

import { NativeScreen } from "@/src/components/ios/NativeScreen";

export function NativeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <NativeScreen>
      <VStack spacing={16} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
        <ContentUnavailableView
          title="Debtulator is unavailable"
          description={message}
          systemImage="exclamationmark.triangle"
        />
        {onRetry ? (
          <Button
            label="Try Again"
            onPress={onRetry}
            modifiers={[buttonStyle("borderedProminent"), controlSize("large")]}
          />
        ) : null}
      </VStack>
    </NativeScreen>
  );
}
