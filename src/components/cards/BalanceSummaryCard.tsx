import { SymbolView } from "expo-symbols";

import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useEffect, useState } from "react";

import { Avatar } from "@/src/components/avatars/Avatar";

import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";

import { componentTokens, spacing, textStyles, useAppTheme } from "@/src/theme";

import { Card } from "./Card";

const PROFILE_ICON = {
  ios: "person.fill",
  android: "person",
} as const;

const ARROW_RIGHT_ICON = {
  ios: "arrow.right",
  android: "arrow_forward",
} as const;

const ARROW_LEFT_ICON = {
  ios: "arrow.left",
  android: "arrow_back",
} as const;

const ARROW_ANIMATION_DURATION = 650;

type BalanceSummaryCardProps = {
  memberName: string;

  netBalance: number;

  debtCount: number;

  currency?: string;
};

export function BalanceSummaryCard({
  memberName,
  netBalance,
  debtCount,
  currency = "kr",
}: BalanceSummaryCardProps) {
  const theme = useAppTheme();

  const [arrowProgress] = useState(() => new Animated.Value(0));

  const direction =
    netBalance > 0
      ? "member_to_you"
      : netBalance < 0
        ? "you_to_member"
        : "even";

  useEffect(() => {
    arrowProgress.stopAnimation();
    arrowProgress.setValue(0);

    if (direction === "even") {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowProgress, {
          toValue: 1,

          duration: ARROW_ANIMATION_DURATION,

          easing: Easing.inOut(Easing.ease),

          useNativeDriver: true,
        }),

        Animated.timing(arrowProgress, {
          toValue: 0,

          duration: ARROW_ANIMATION_DURATION,

          easing: Easing.inOut(Easing.ease),

          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [arrowProgress, direction]);

  const arrowDistance =
    direction === "member_to_you" ? -spacing.xs : spacing.xs;

  const translateX = arrowProgress.interpolate({
    inputRange: [0, 1],

    outputRange: [0, arrowDistance],
  });

  return (
    <Card variant="onBrand">
      <View style={styles.content}>
        <Text
          style={[
            styles.relationshipTitle,
            {
              color: theme.colors.onHeroBackground,
            },
          ]}
        >
          {formatRelationshipTitle(direction, memberName)}
        </Text>

        <View style={styles.relationship}>
          <Participant
            title="You"
            avatar={
              <Avatar
                icon={PROFILE_ICON}
                size={componentTokens.avatar.listSize}
                variant="onBrand"
              />
            }
          />

          <View style={styles.center}>
            <Text
              style={[
                styles.amount,
                {
                  color: theme.colors.onHeroBackground,
                },
              ]}
            >
              {formatAmount(Math.abs(netBalance), currency)}
            </Text>

            <View style={styles.arrowArea}>
              {direction !== "even" ? (
                <Animated.View
                  style={{
                    transform: [{ translateX }],
                  }}
                >
                  <SymbolView
                    name={
                      direction === "member_to_you"
                        ? ARROW_LEFT_ICON
                        : ARROW_RIGHT_ICON
                    }
                    tintColor={theme.colors.onHeroBackground}
                    size={textStyles.headline.fontSize}
                  />
                </Animated.View>
              ) : null}
            </View>
          </View>

          <Participant
            title={memberName}
            avatar={
              <MemberAvatar
                displayName={memberName}
                size={componentTokens.avatar.listSize}
                variant="onBrand"
              />
            }
          />
        </View>

        <Text
          style={[
            styles.summary,
            {
              color: theme.colors.onBrandMuted,
            },
          ]}
        >
          {formatDebtSummary(debtCount)}
        </Text>
      </View>
    </Card>
  );
}

type ParticipantProps = {
  title: string;
  avatar: React.ReactNode;
};

function Participant({ title, avatar }: ParticipantProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.participant}>
      {avatar}

      <Text
        numberOfLines={1}
        style={[
          styles.participantTitle,
          {
            color: theme.colors.onHeroBackground,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

type BalanceDirection = "member_to_you" | "you_to_member" | "even";

function formatRelationshipTitle(
  direction: BalanceDirection,
  memberName: string,
): string {
  switch (direction) {
    case "member_to_you":
      return `${memberName} owes You`;

    case "you_to_member":
      return `You owe ${memberName}`;

    case "even":
      return `You and ${memberName} are even`;
  }
}

function formatDebtSummary(debtCount: number): string {
  return debtCount === 1 ? "From 1 debt" : `From ${debtCount} debts`;
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  relationshipTitle: {
    ...textStyles.headline,
    textAlign: "center",
  },

  relationship: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },

  participant: {
    flex: 1,
    alignItems: "center",
  },

  participantTitle: {
    ...textStyles.caption,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  amount: {
    ...textStyles.headline,
    textAlign: "center",
  },

  arrowArea: {
    minHeight: textStyles.headline.fontSize,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },

  summary: {
    ...textStyles.caption,
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
