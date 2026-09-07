import { Stack, useLocalSearchParams } from "expo-router";

import { useCallback, useMemo, useState } from "react";

import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SegmentedControl } from "@/src/components/controls";
import { SolidScreen } from "@/src/components/layout";

import { useDebts } from "@/src/features/debts/hooks/useDebts";
import { buildDebtsScreenModel } from "@/src/features/debts/model/DebtsScreenModel";

import { MemberDetailsHeader } from "@/src/features/members/components/MemberDetailsHeader";
import { useMember } from "@/src/features/members/hooks/useMember";

import {
  MEMBER_DETAILS_SECTIONS,
  MEMBER_DETAILS_TRANSITION_DURATION,
  type MemberDetailsSection,
} from "@/src/features/members/screens/member-details/memberDetailsSections";

import {
  MemberActivitySection,
  MemberDebtsSection,
  MemberOverviewSection,
} from "@/src/features/members/screens/member-details/sections";

import { spacing } from "@/src/theme";

const SECTION_TRANSITION = {
  duration: MEMBER_DETAILS_TRANSITION_DURATION,
  easing: Easing.inOut(Easing.ease),
  reduceMotion: ReduceMotion.System,
};

export function MemberDetailsScreen() {
  const params = useLocalSearchParams<{
    memberId?: string;
  }>();

  const memberId = typeof params.memberId === "string" ? params.memberId : null;

  const member = useMember(memberId);

  const debts = useDebts();

  const [section, setSection] = useState<MemberDetailsSection>("overview");
  const collapseProgress = useSharedValue(0);
  const contentProgress = useSharedValue(1);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentProgress.value,
    transform: [
      {
        translateY: (1 - contentProgress.value) * spacing.sm,
      },
    ],
  }));

  const changeSection = useCallback(
    (nextSection: MemberDetailsSection) => {
      if (nextSection === section) {
        return;
      }

      collapseProgress.set(
        withTiming(
          nextSection === "overview" ? 0 : 1,
          SECTION_TRANSITION,
        ),
      );

      contentProgress.set(0);
      contentProgress.set(withTiming(1, SECTION_TRANSITION));

      setSection(nextSection);
    },
    [collapseProgress, contentProgress, section],
  );

  const memberDebts = useMemo(() => {
    if (!memberId) {
      return [];
    }

    return debts.data.filter((debt) => debt.memberId === memberId);
  }, [debts.data, memberId]);

  const memberDebtsModel = useMemo(
    () =>
      buildDebtsScreenModel(
        memberDebts,
        member.data ? [member.data] : [],
      ),
    [member.data, memberDebts],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: member.data?.displayName ?? "Member",
        }}
      />

      <SolidScreen>
        {member.data ? (
          <>
            <MemberDetailsHeader
              member={member.data}
              compact={section !== "overview"}
              collapseProgress={collapseProgress}
            />

            <View style={styles.sectionControl}>
              <SegmentedControl
                value={section}
                options={MEMBER_DETAILS_SECTIONS}
                onChange={changeSection}
                variant="onBrand"
              />
            </View>

            <Animated.View style={contentStyle}>
              {section === "overview" ? (
                <MemberOverviewSection
                  member={member.data}
                  balance={memberDebtsModel}
                />
              ) : null}

              {section === "debts" ? (
                <MemberDebtsSection
                  memberName={member.data.displayName}
                  items={memberDebtsModel.items}
                  loading={debts.loading}
                  error={debts.error?.message ?? null}
                  onRetry={debts.refresh}
                />
              ) : null}

              {section === "activity" ? <MemberActivitySection /> : null}
            </Animated.View>
          </>
        ) : null}
      </SolidScreen>
    </>
  );
}

const styles = StyleSheet.create({
  sectionControl: {
    width: "100%",

    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
