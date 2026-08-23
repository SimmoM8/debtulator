import { BottomSheet, Host } from "@expo/ui";
import type { ReactNode } from "react";

type FormSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  size?: "compact" | "full";
  children: ReactNode;
};

export function FormSheet({
  isPresented,
  onDismiss,
  size = "full",
  children,
}: FormSheetProps) {
  if (!isPresented) {
    return null;
  }

  return (
    <Host matchContents>
      <BottomSheet
        isPresented
        onDismiss={onDismiss}
        snapPoints={size === "compact" ? ["half", "full"] : ["full"]}
      >
        {children}
      </BottomSheet>
    </Host>
  );
}
