import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

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

type BalanceDirection = "member_to_you" | "you_to_member" | "even";

type ParticipantProps = {
  title: string;
  avatar: ReactNode;
};

export function BalanceSummaryCard({
  memberName,
  netBalance,
  debtCount,
  currency = "kr",
}: BalanceSummaryCardProps) {
  const theme = useAppTheme();
  const [arrowProgress] = useState(() => new Animated.Value(0));

  const direction: BalanceDirection =
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
        <View style={styles.heading}>
          <Text
            numberOfLines={1}
            style={[
              styles.relationshipTitle,
              { color: theme.colors.onHeroBackground },
            ]}
          >
            {formatRelationshipTitle(direction, memberName)}
          </Text>

          <Text
            style={[styles.debtCount, { color: theme.colors.onBrandMuted }]}
          >
            · {formatDebtCount(debtCount)}
          </Text>
        </View>

        <View style={styles.balanceRow}>
          <Participant
            title="You"
            avatar={
              <Avatar
                icon={PROFILE_ICON}
                size={componentTokens.avatar.summarySize}
                variant="onBrand"
              />
            }
          />

          <View style={styles.balance}>
            <Text
              numberOfLines={1}
              style={[styles.amount, { color: theme.colors.onHeroBackground }]}
            >
              {formatAmount(Math.abs(netBalance), currency)}
            </Text>

            <View style={styles.arrowArea}>
              {direction !== "even" ? (
                <Animated.View style={{ transform: [{ translateX }] }}>
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
                size={componentTokens.avatar.summarySize}
                variant="onBrand"
              />
            }
          />
        </View>
      </View>
    </Card>
  );
}

function Participant({ title, avatar }: ParticipantProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.participant}>
      {avatar}

      <Text
        numberOfLines={1}
        style={[
          styles.participantTitle,
          { color: theme.colors.onHeroBackground },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

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

function formatDebtCount(debtCount: number): string {
  return debtCount === 1 ? "1 debt" : `${debtCount} debts`;
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString()} ${currency}`;
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  relationshipTitle: {
    ...textStyles.headline,
    flexShrink: 1,
  },
  debtCount: {
    ...textStyles.caption,
    marginLeft: spacing.xs,
  },
  balanceRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.md,
  },
  participant: {
    flex: 1,
    alignItems: "center",
  },
  participantTitle: {
    ...textStyles.caption,
    maxWidth: "100%",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  balance: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: spacing.sm,
  },
  amount: {
    ...textStyles.title,
    textAlign: "center",
  },
  arrowArea: {
    minHeight: textStyles.headline.fontSize,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
});
