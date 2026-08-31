import { useMembers } from "@/src/features/members/hooks/useMembers";
import { List, ListItem } from "@expo/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { toolbarIcons } from "@/src/components/navigation/toolbarIcons";
import { ListState } from "@/src/components/states/ListState";
import { useNewDebt } from "@/src/features/debts/state/NewDebtProvider";
import { NativeThemeHost, useAppTheme } from "@/src/theme";

export function SelectMemberScreen() {
  const draft = useNewDebt();
  const members = useMembers();

  const theme = useAppTheme();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  const isChangingMember = from === "new-debt";
  const [searchQuery, setSearchQuery] = useState("");
  const hasSearchQuery = searchQuery.trim().length > 0;

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    if (!query) {
      return members.data;
    }

    return members.data.filter((member) =>
      member.displayName.toLocaleLowerCase().includes(query),
    );
  }, [members.data, searchQuery]);

  function close() {
    draft.reset();
    router.dismiss();
  }

  function selectMember(memberId: string) {
    draft.setMemberId(memberId);

    if (isChangingMember) {
      router.back();
      return;
    }

    router.replace("/(main)/(modals)/debt/new");
  }

  const showList =
    !members.loading && members.error === null && filteredMembers.length > 0;

  return (
    <>
      {isChangingMember ? (
        <Stack.Screen.BackButton displayMode="minimal" />
      ) : (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={toolbarIcons.close}
            accessibilityLabel="Close"
            onPress={close}
          />
        </Stack.Toolbar>
      )}

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.plus}
          accessibilityLabel="Add member"
          onPress={() => {
            // Add Member flow later.
          }}
        />
      </Stack.Toolbar>

      <Stack.SearchBar
        placeholder="Search Members"
        onChangeText={(event) => {
          setSearchQuery(event.nativeEvent.text ?? "");
        }}
      />

      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.appBackground,
          },
        ]}
      >
        <NativeThemeHost useViewportSizeMeasurement style={styles.host}>
          {showList ? (
            <List>
              {filteredMembers.map((member) => (
                <ListItem
                  key={member.id}
                  onPress={() => {
                    selectMember(member.id);
                  }}
                >
                  {member.displayName}
                </ListItem>
              ))}
            </List>
          ) : (
            <ListState
              loading={members.loading}
              error={members.error}
              totalCount={members.data.length}
              visibleCount={filteredMembers.length}
              loadingState={{
                title: "Loading members…",
                message: "Your members are being loaded.",
              }}
              emptyState={{
                title: "No members yet",
                message: "Add a member before creating a debt.",
              }}
              noResultsState={
                hasSearchQuery
                  ? {
                      title: "No matching members",
                      message: `No members match “${searchQuery.trim()}”.`,
                    }
                  : undefined
              }
              errorState={{
                title: "Couldn’t load members",
                message: "Your members couldn’t be loaded. Try again.",
              }}
              onRetry={members.refresh}
            />
          )}
        </NativeThemeHost>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
});
