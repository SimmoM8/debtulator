import { StyleSheet, Text, View } from "react-native";

import {
    QuickActionBar,
    type QuickAction,
} from "@/src/components/actions/QuickActionBar";

import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import type { Member } from "@/src/features/members/model/Member";

import { componentTokens, spacing, textStyles, useAppTheme } from "@/src/theme";

type MemberDetailsHeaderProps = {
  member: Member;
};

const QUICK_ACTIONS = [
  {
    id: "add-debt",

    label: "Add debt",

    icon: {
      ios: "plus",
      android: "add",
    },
  },

  {
    id: "settle-up",

    label: "Settle up",

    icon: {
      ios: "arrow.left.arrow.right",
      android: "swap_horiz",
    },
  },

  {
    id: "pay",

    label: "Pay",

    icon: {
      ios: "creditcard.fill",
      android: "payments",
    },
  },

  {
    id: "remind",

    label: "Remind",

    icon: {
      ios: "bell.fill",
      android: "notifications",
    },
  },
] as const satisfies readonly QuickAction[];

export function MemberDetailsHeader({ member }: MemberDetailsHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <MemberAvatar
        displayName={member.displayName}
        size={componentTokens.avatar.heroSize}
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
            color: theme.colors.onBrandMuted,
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

    textAlign: "center",
  },

  actions: {
    width: "100%",

    marginTop: spacing.lg,
  },
});
