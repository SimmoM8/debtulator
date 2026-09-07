import { StyleSheet, View } from "react-native";

import { DebtListRow } from "@/src/features/debts/components/DebtListRow";
import type { DebtListItem } from "@/src/features/debts/model/DebtListItem";
import type { ContentSurfaceVariant } from "@/src/theme";

type DebtsListProps = {
  items: readonly DebtListItem[];
  onPressItem?: (id: string) => void;
  variant?: ContentSurfaceVariant;
};

export function DebtsList({
  items,
  onPressItem,
  variant = "default",
}: DebtsListProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <DebtListRow
          key={item.id}
          item={item}
          variant={variant}
          onPress={onPressItem ? () => onPressItem(item.id) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});
