import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { SplitBackgroundScreen } from "@/src/components/layout";
import {
  ListState,
  type ListStateMessage,
} from "@/src/components/states/ListState";
import {
  MemberSummaryHeader,
  type MemberFilter,
} from "@/src/features/members/components/MemberSummaryHeader";
import { MembersList } from "@/src/features/members/components/MembersList";
import { useMembers } from "@/src/features/members/hooks/useMembers";
import { buildMembersScreenModel } from "@/src/features/members/model/MembersScreenModel";
import { useAppTheme } from "@/src/theme";
import { router } from "expo-router";

export function MembersScreen() {
  const members = useMembers();

  const theme = useAppTheme();

  const [filter, setFilter] = useState<MemberFilter>("all");

  /*
   * Until member linking is implemented, no members have a linked identity.
   *
   * Once linking exists, pass the linked member ids as the second argument
   * instead of changing the Member domain model or this screen.
   */
  const model = useMemo(
    () => buildMembersScreenModel(members.data),
    [members.data],
  );

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return model.items;
    }

    return model.items.filter((item) => item.linkStatus === filter);
  }, [filter, model.items]);

  const showList =
    !members.loading && members.error === null && filteredItems.length > 0;

  return (
    <SplitBackgroundScreen
      hero={
        <MemberSummaryHeader
          totalCount={model.totalCount}
          linkedCount={model.linkedCount}
          nonLinkedCount={model.nonLinkedCount}
          filter={filter}
          onFilterChange={setFilter}
        />
      }
    >
      <View
        style={[
          styles.content,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        {showList ? (
          <MembersList
            items={filteredItems}
            onPressItem={(memberId) => {
              router.push({
                pathname: "/(main)/(tabs)/members/[memberId]",
                params: {
                  memberId,
                },
              });
            }}
          />
        ) : (
          <ListState
            loading={members.loading}
            error={members.error?.message ?? null}
            totalCount={model.totalCount}
            visibleCount={filteredItems.length}
            loadingState={{
              title: "Loading members…",
              message: "Your members are being loaded.",
            }}
            emptyState={{
              title: "No members yet",
              message: "Add your first member to get started.",
            }}
            noResultsState={getMemberNoResultsState(filter)}
            errorState={{
              title: "Couldn’t load members",
              message: "Your members couldn’t be loaded. Try again.",
            }}
            onRetry={members.refresh}
          />
        )}
      </View>
    </SplitBackgroundScreen>
  );
}

function getMemberNoResultsState(filter: MemberFilter): ListStateMessage {
  switch (filter) {
    case "linked":
      return {
        title: "No linked members",
        message: "You haven’t linked any members yet.",
      };

    case "non_linked":
      return {
        title: "No non-linked members",
        message: "All of your members are linked.",
      };

    case "all":
      return {
        title: "No members",
        message: "There are no members to show.",
      };
  }
}

const styles = StyleSheet.create({
  content: {
    minHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
});
