import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BalanceSummaryCard } from "@/src/components/cards/BalanceSummaryCard";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/lists/GroupedList";
import type { DebtBalanceSummary } from "@/src/features/debts/model/DebtBalanceSummary";
import type { Member } from "@/src/features/members/model/Member";
import { openLinkMember } from "@/src/features/members/operations/openLinkMember";
import { spacing, textStyles, useAppTheme } from "@/src/theme";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

const DISPLAY_NAME_ICON: SymbolName = {
  ios: "person",
  android: "person",
};

const LINK_ICON: SymbolName = {
  ios: "link",
  android: "link",
};

const DISPLAY_NAME_CHEVRON: SymbolName = {
  ios: "chevron.right",
  android: "chevron_right",
};

type MemberOverviewSectionProps = {
  member: Member;
  balance: DebtBalanceSummary;
};

export function MemberOverviewSection({
  member,
  balance,
}: MemberOverviewSectionProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.section}>
      <BalanceSummaryCard
        memberName={member.displayName}
        netBalance={balance.netBalance}
        debtCount={balance.youOweCount + balance.theyOweCount}
      />

      <View style={styles.info}>
        <GroupedList>
          <GroupedListSection>
            <GroupedListRow
              icon={DISPLAY_NAME_ICON}
              label="Display name"
              value={member.displayName}
              trailingIcon={DISPLAY_NAME_CHEVRON}
            />
          </GroupedListSection>

          <GroupedListSection>
            <GroupedListRow
              icon={LINK_ICON}
              label="Not linked"
              trailing={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    openLinkMember({ memberId: member.id });
                  }}
                >
                  <Text
                    style={[
                      styles.linkAction,
                      { color: theme.colors.controlTint },
                    ]}
                  >
                    Link member
                  </Text>
                </Pressable>
              }
            />
          </GroupedListSection>
        </GroupedList>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  info: {
    marginTop: spacing.lg,
  },
  linkAction: {
    ...textStyles.caption,
    fontWeight: textStyles.headline.fontWeight,
  },
});
