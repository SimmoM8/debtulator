import LinkIcon from "@expo/material-symbols/link.xml";
import PersonIcon from "@expo/material-symbols/person.xml";

import { Button, Icon, Text } from "@expo/ui";

import { StyleSheet, View } from "react-native";

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

const DISPLAY_NAME_ICON = Icon.select({
  ios: "person",
  android: PersonIcon,
});

const LINK_ICON = Icon.select({
  ios: "link",
  android: LinkIcon,
});

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
        youOwe={balance.youOwe}
        theyOwe={balance.theyOwe}
        youOweCount={balance.youOweCount}
        theyOweCount={balance.theyOweCount}
        netBalance={balance.netBalance}
      />

      <View style={styles.info}>
        <GroupedList>
          <GroupedListSection title="Member info">
            <GroupedListRow
              icon={DISPLAY_NAME_ICON}
              label="Display name"
              value={member.displayName}
            />
          </GroupedListSection>

          <GroupedListSection title="Linked identity">
            <GroupedListRow
              icon={LINK_ICON}
              label="Not linked"
              trailing={
                <Button
                  variant="text"
                  onPress={() => {
                    openLinkMember({
                      memberId: member.id,
                    });
                  }}
                >
                  <Text
                    textStyle={{
                      ...textStyles.caption,
                      color: theme.colors.controlTint,
                    }}
                  >
                    Link member
                  </Text>
                </Button>
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
});
