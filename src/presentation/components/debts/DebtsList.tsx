import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DebtListItemModel } from "@/src/presentation/dto/debtsScreenModel";
import { colors, textStyles } from "@/src/theme";

type DebtsListProps = {
  items: DebtListItemModel[];
  onPressItem?: (id: string) => void;
};

export function DebtsList({ items, onPressItem }: DebtsListProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => onPressItem?.(item.id)}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>

            <Text style={styles.subtitle}>
              {item.direction === "you_owe"
                ? `You owe ${item.person}`
                : `${item.person} owes you`}
            </Text>
          </View>

          <Text style={styles.amount}>
            {item.amount} {item.currency}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 24,
    paddingVertical: 16,

    backgroundColor: colors.appBackground,
  },

  pressed: {
    opacity: 0.65,
  },

  content: {
    flex: 1,
    marginRight: 16,
  },

  title: {
    ...textStyles.body,
    color: colors.native.text,
  },

  subtitle: {
    ...textStyles.caption,
    color: colors.native.secondaryText,
    marginTop: 4,
  },

  amount: {
    ...textStyles.body,
    color: colors.native.text,
  },
});
