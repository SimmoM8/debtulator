import { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import {
  addDebtQuickAction,
  QuickActionBar,
} from "@/src/components/quick-actions";
import { MemberAvatar } from "@/src/features/members/components/MemberAvatar";
import type { Member } from "@/src/features/members/model/Member";
import { componentTokens, spacing, textStyles, useAppTheme } from "@/src/theme";

const EXPANDED_IDENTITY_HEIGHT = 160;
const COMPACT_IDENTITY_HEIGHT =
  componentTokens.avatar.listSize + spacing.sm * 2;

type MemberDetailsHeaderProps = {
  member: Member;
  compact: boolean;
  collapseProgress: SharedValue<number>;
};

export function MemberDetailsHeader({
  member,
  compact,
  collapseProgress,
}: MemberDetailsHeaderProps) {
  const theme = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const expandedActionsHeight = useSharedValue(0);

  const quickActions = useMemo(
    () => [
      addDebtQuickAction({
        memberId: member.id,
      }),

      // Add additional reusable quick-action adapters here.
    ],
    [member.id],
  );

  const identityAreaStyle = useAnimatedStyle(() => ({
    height: interpolate(
      collapseProgress.value,
      [0, 1],
      [EXPANDED_IDENTITY_HEIGHT, COMPACT_IDENTITY_HEIGHT],
    ),
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    left: interpolate(
      collapseProgress.value,
      [0, 1],
      [(screenWidth - componentTokens.avatar.heroSize) / 2, spacing.lg],
    ),
    top: interpolate(collapseProgress.value, [0, 1], [spacing.md, spacing.sm]),
    transform: [
      {
        scale: interpolate(
          collapseProgress.value,
          [0, 1],
          [
            1,
            componentTokens.avatar.listSize / componentTokens.avatar.heroSize,
          ],
        ),
      },
    ],
  }));

  const expandedIdentityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      collapseProgress.value,
      [0, 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          collapseProgress.value,
          [0, 1],
          [0, -spacing.sm],
        ),
      },
    ],
  }));

  const compactIdentityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      collapseProgress.value,
      [0.35, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          collapseProgress.value,
          [0, 1],
          [spacing.md, 0],
        ),
      },
    ],
  }));

  const actionsStyle = useAnimatedStyle(() => {
    const expandedHeight = expandedActionsHeight.value;

    return {
      height:
        expandedHeight > 0
          ? interpolate(collapseProgress.value, [0, 1], [expandedHeight, 0])
          : undefined,
      marginTop: interpolate(collapseProgress.value, [0, 1], [spacing.lg, 0]),
      opacity: interpolate(
        collapseProgress.value,
        [0, 0.7],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            collapseProgress.value,
            [0, 1],
            [0, -spacing.md],
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.identityArea, identityAreaStyle]}>
        <Animated.View style={[styles.avatar, avatarStyle]}>
          <MemberAvatar
            displayName={member.displayName}
            size={componentTokens.avatar.heroSize}
            variant="onBrand"
          />
        </Animated.View>

        <Animated.View
          accessibilityElementsHidden={compact}
          importantForAccessibility={compact ? "no-hide-descendants" : "auto"}
          style={[styles.expandedIdentity, expandedIdentityStyle]}
        >
          <Text
            style={[
              styles.expandedName,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            {member.displayName}
          </Text>

          <Text
            style={[
              styles.expandedStatus,
              {
                color: theme.colors.onBrandMuted,
              },
            ]}
          >
            Unlinked Member
          </Text>
        </Animated.View>

        <Animated.View
          accessibilityElementsHidden={!compact}
          importantForAccessibility={!compact ? "no-hide-descendants" : "auto"}
          style={[styles.compactIdentity, compactIdentityStyle]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.compactName,
              {
                color: theme.colors.onHeroBackground,
              },
            ]}
          >
            {member.displayName}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.compactStatus,
              {
                color: theme.colors.onBrandMuted,
              },
            ]}
          >
            Unlinked Member
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        importantForAccessibility={compact ? "no-hide-descendants" : "auto"}
        onLayout={(event) => {
          const measuredHeight = event.nativeEvent.layout.height;

          if (measuredHeight > expandedActionsHeight.value) {
            expandedActionsHeight.set(measuredHeight);
          }
        }}
        pointerEvents={compact ? "none" : "auto"}
        style={[styles.actions, actionsStyle]}
      >
        <QuickActionBar actions={quickActions} variant="onBrand" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  identityArea: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  avatar: {
    position: "absolute",
    width: componentTokens.avatar.heroSize,
    height: componentTokens.avatar.heroSize,
    transformOrigin: "top left",
  },
  expandedIdentity: {
    position: "absolute",
    top: spacing.md + componentTokens.avatar.heroSize + spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  expandedName: {
    ...textStyles.title,
    textAlign: "center",
  },
  expandedStatus: {
    ...textStyles.caption,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  compactIdentity: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.lg + componentTokens.avatar.listSize + spacing.md,
    right: spacing.lg,
    height: componentTokens.avatar.listSize,
    flexDirection: "row",
    alignItems: "center",
  },
  compactName: {
    ...textStyles.headline,
    flexShrink: 1,
  },
  compactStatus: {
    ...textStyles.caption,
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  actions: {
    width: "100%",
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
  },
});
