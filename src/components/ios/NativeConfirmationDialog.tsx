import { Button, ConfirmationDialog, Text } from "@expo/ui/swift-ui";

export function NativeConfirmationDialog({
  title,
  message,
  actionLabel,
  isPresented,
  destructive = false,
  onPresentedChange,
  onConfirm,
}: {
  title: string;
  message: string;
  actionLabel: string;
  isPresented: boolean;
  destructive?: boolean;
  onPresentedChange: (presented: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationDialog
      title={title}
      isPresented={isPresented}
      onIsPresentedChange={onPresentedChange}
      titleVisibility="visible"
    >
      <ConfirmationDialog.Actions>
        <Button
          label={actionLabel}
          role={destructive ? "destructive" : "default"}
          onPress={onConfirm}
        />
        <Button label="Cancel" role="cancel" />
      </ConfirmationDialog.Actions>
      <ConfirmationDialog.Message>
        <Text>{message}</Text>
      </ConfirmationDialog.Message>
    </ConfirmationDialog>
  );
}
