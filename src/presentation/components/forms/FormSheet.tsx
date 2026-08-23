import { BottomSheet, Host, RNHostView } from "@expo/ui";
import type { ReactElement } from "react";

type FormSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  children: ReactElement;
};

export function FormSheet({
  isPresented,
  onDismiss,
  children,
}: FormSheetProps) {
  return (
    <Host matchContents>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        snapPoints={["half", "full"]}
      >
        <RNHostView>{children}</RNHostView>
      </BottomSheet>
    </Host>
  );
}
