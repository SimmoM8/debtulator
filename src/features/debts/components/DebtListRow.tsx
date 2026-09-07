import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DebtListItem } from "@/src/features/debts/model/DebtListItem";
import {
  getContentSurfaceAppearance,
  spacing,
  textStyles,
  useAppTheme,
  type ContentSurfaceVariant,
} from "@/src/theme";

type DebtListRowProps = {
  item: DebtListItem;
  onPress?: () => void;
  variant?: ContentSurfaceVariant;
};

export function DebtListRow({
  item,
  onPress,
  variant = "default",
}: DebtListRowProps) {
  const theme = useAppTheme();
  const appearance = getContentSurfaceAppearance(theme.colors, variant);

  const content = (
    <>
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: appearance.contentColor,
            },
          ]}
        >
          {item.title}
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: appearance.mutedContentColor,
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
            color: appearance.contentColor,
          },
        ]}
      >
        {item.amount} kr
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...textStyles.body,
  },
  subtitle: {
    ...textStyles.caption,
    marginTop: spacing.xs,
  },
  amount: {
    ...textStyles.body,
  },
  pressed: {
    opacity: 0.65,
  },
});
