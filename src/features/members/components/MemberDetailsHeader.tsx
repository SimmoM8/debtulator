import { StyleSheet, Text, View } from "react-native";

import {
    QuickActionBar,
    type QuickAction,
} from "@/src/components/actions/QuickActionBar";
import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import type { Member } from "@/src/features/members/model/Member";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

type MemberDetailsHeaderProps = {
  member: Member;
  onAddDebt: () => void;
  onSettleUp: () => void;
  onPay: () => void;
  onRemind: () => void;
};

export function MemberDetailsHeader({
  member,
  onAddDebt,
  onPay,
  onSettleUp,
  onRemind,
}: MemberDetailsHeaderProps) {
  const theme = useAppTheme();

  const QUICK_ACTIONS: readonly QuickAction[] = [
    {
      id: "add-debt",
      label: "Add debt",
      icon: {
        ios: "plus",
        android: "add",
      },
      onPress: onAddDebt,
    },
    {
      id: "settle-up",
      label: "Settle up",
      icon: {
        ios: "arrow.left.arrow.right",
        android: "swap_horiz",
      },
      onPress: onSettleUp,
    },
    {
      id: "pay",
      label: "Pay",
      icon: {
        ios: "creditcard.fill",
        android: "payments",
      },
      onPress: onPay,
    },
    {
      id: "remind",
      label: "Remind",
      icon: {
        ios: "bell.fill",
        android: "notifications",
      },
      onPress: onRemind,
    },
  ];

  return (
    <View style={styles.container}>
      <MemberAvatar
        displayName={member.displayName}
        size={88}
        variant="onBrand"
      />

      <Text
        style={[
          styles.name,
          {
            color: theme.colors.onHeroBackground,
          },
        ]}
      >
        {member.displayName}
      </Text>

      <Text
        style={[
          styles.status,
          {
            color: theme.colors.onHeroBackground,
          },
        ]}
      >
        Unlinked Member
      </Text>

      <View style={styles.actions}>
        <QuickActionBar actions={QUICK_ACTIONS} variant="onBrand" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  name: {
    ...textStyles.title,
    marginTop: spacing.md,
    textAlign: "center",
  },

  status: {
    ...textStyles.caption,
    marginTop: spacing.xs,
    opacity: 0.65,
    textAlign: "center",
  },

  actions: {
    width: "100%",
    marginTop: spacing.lg,
  },
});
