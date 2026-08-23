import { BottomSheet, Column, Host, ScrollView, Text } from "@expo/ui";
import type { PropsWithChildren } from "react";

type FormSheetProps = PropsWithChildren<{
  isPresented: boolean;
  title: string;
  onDismiss: () => void;
}>;

export function FormSheet({
  isPresented,
  title,
  onDismiss,
  children,
}: FormSheetProps) {
  return (
    <Host matchContents>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        snapPoints={["full"]}
      >
        <ScrollView>
          <Column spacing={16} style={{ padding: 24 }}>
            <Text textStyle={{ fontSize: 24, fontWeight: "700" }}>{title}</Text>
            {children}
          </Column>
        </ScrollView>
      </BottomSheet>
    </Host>
  );
}
