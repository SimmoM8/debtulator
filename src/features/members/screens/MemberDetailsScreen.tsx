import { Stack, useLocalSearchParams } from "expo-router";

import { useMemo, useState } from "react";

import { StyleSheet, View } from "react-native";

import { SegmentedControl } from "@/src/components/controls";
import { SolidScreen } from "@/src/components/layout";

import { useDebts } from "@/src/features/debts/hooks/useDebts";
import { buildDebtBalanceSummary } from "@/src/features/debts/model/DebtBalanceSummary";

import { MemberDetailsHeader } from "@/src/features/members/components/MemberDetailsHeader";
import { useMember } from "@/src/features/members/hooks/useMember";

import {
  MEMBER_DETAILS_SECTIONS,
  type MemberDetailsSection,
} from "@/src/features/members/screens/member-details/memberDetailsSections";

import {
  MemberActivitySection,
  MemberDebtsSection,
  MemberOverviewSection,
} from "@/src/features/members/screens/member-details/sections";

import { spacing } from "@/src/theme";

export function MemberDetailsScreen() {
  const params = useLocalSearchParams<{
    memberId?: string;
  }>();

  const memberId = typeof params.memberId === "string" ? params.memberId : null;

  const member = useMember(memberId);

  const debts = useDebts();

  const [section, setSection] = useState<MemberDetailsSection>("overview");

  const memberDebts = useMemo(() => {
    if (!memberId) {
      return [];
    }

    return debts.data.filter((debt) => debt.memberId === memberId);
  }, [debts.data, memberId]);

  const balance = useMemo(
    () => buildDebtBalanceSummary(memberDebts),
    [memberDebts],
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
            <MemberDetailsHeader member={member.data} />

            <View style={styles.sectionControl}>
              <SegmentedControl
                value={section}
                options={MEMBER_DETAILS_SECTIONS}
                onChange={setSection}
                variant="onBrand"
              />
            </View>

            {section === "overview" ? (
              <MemberOverviewSection member={member.data} balance={balance} />
            ) : null}

            {section === "debts" ? <MemberDebtsSection /> : null}

            {section === "activity" ? <MemberActivitySection /> : null}
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
