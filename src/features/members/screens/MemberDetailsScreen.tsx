import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { BalanceSummaryCard } from "@/src/components/cards/BalanceSummaryCard";
import { SolidScreen } from "@/src/components/layout";

import { useDebts } from "@/src/features/debts/hooks/useDebts";
import { buildDebtBalanceSummary } from "@/src/features/debts/model/DebtBalanceSummary";

import { MemberDetailsHeader } from "@/src/features/members/components/MemberDetailsHeader";
import { useMember } from "@/src/features/members/hooks/useMember";

import { spacing } from "@/src/theme";

export function MemberDetailsScreen() {
  const params = useLocalSearchParams<{
    memberId?: string;
  }>();

  const memberId = typeof params.memberId === "string" ? params.memberId : null;

  const member = useMember(memberId);

  const debts = useDebts();

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

            <View style={styles.content}>
              <BalanceSummaryCard
                youOwe={balance.youOwe}
                theyOwe={balance.theyOwe}
                youOweCount={balance.youOweCount}
                theyOweCount={balance.theyOweCount}
                netBalance={balance.netBalance}
              />
            </View>
          </>
        ) : null}
      </SolidScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
