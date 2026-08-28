import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DebtListItemModel } from "@/src/presentation/dto/debtsScreenDto";

import { textStyles, useAppTheme } from "@/src/theme";

type DebtsListProps = {
  items: DebtListItemModel[];

  onPressItem?: (id: string) => void;
};

export function DebtsList({ items, onPressItem }: DebtsListProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [
            styles.row,

            {
              backgroundColor: theme.colors.appBackground,
            },

            pressed && styles.pressed,
          ]}
          onPress={() => onPressItem?.(item.id)}
        >
          <View style={styles.content}>
            <Text
              style={[
                styles.title,

                {
                  color: theme.colors.text,
                },
              ]}
            >
              {item.title}
            </Text>

            <Text
              style={[
                styles.subtitle,

                {
                  color: theme.colors.secondaryText,
                },
              ]}
            >
              {item.direction === "you_owe"
                ? `You owe ${item.person}`
                : `${item.person} owes you`}
            </Text>
          </View>

          <Text
            style={[
              styles.amount,

              {
                color: theme.colors.text,
              },
            ]}
          >
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
  },

  subtitle: {
    ...textStyles.caption,

    marginTop: 4,
  },

  amount: {
    ...textStyles.body,
  },
});
