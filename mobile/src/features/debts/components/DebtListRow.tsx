import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMoney } from "@/src/features/currencies/utils/money";
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
        <Text style={[styles.title, { color: appearance.contentColor }]}>
          {item.title}
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: appearance.mutedContentColor },
          ]}
        >
          {item.direction === "you_owe"
            ? `You owe ${item.person}`
            : `${item.person} owes you`}
        </Text>

        {item.agreementStatus !== "private" ? (
          <Text
            style={[
              styles.agreement,
              { color: agreementColor(item.agreementStatus, theme.colors) },
            ]}
          >
            {agreementLabel(item.agreementStatus)}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.amount, { color: appearance.contentColor }]}>
        {formatMoney(item.money)}
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

function agreementLabel(status: DebtListItem["agreementStatus"]): string {
  switch (status) {
    case "agreed":
      return "Agreed";
    case "pending":
      return "Pending agreement";
    case "disagreed":
      return "Not agreed";
    case "private":
      return "Private";
  }
}

function agreementColor(
  status: DebtListItem["agreementStatus"],
  colors: ReturnType<typeof useAppTheme>["colors"],
): string {
  switch (status) {
    case "agreed":
      return colors.success;
    case "pending":
      return colors.warning;
    case "disagreed":
      return colors.danger;
    case "private":
      return colors.secondaryText;
  }
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
  agreement: {
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
