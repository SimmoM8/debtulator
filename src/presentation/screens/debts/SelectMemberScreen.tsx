import { List, ListItem } from "@expo/ui";

import { router, Stack, useLocalSearchParams } from "expo-router";

import { useMemo, useState } from "react";

import { StyleSheet, View } from "react-native";

import { useAppData } from "@/src/presentation/providers/AppDataProvider";

import { useNewDebtDraft } from "@/src/presentation/providers/NewDebtDraftProvider";

import { NativeThemeHost, useAppTheme } from "@/src/theme";

export function SelectMemberScreen() {
  const data = useAppData();

  const draft = useNewDebtDraft();

  const theme = useAppTheme();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  const isChangingMember = from === "new-debt";

  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    if (!query) {
      return data.members;
    }

    return data.members.filter((member) =>
      member.displayName.toLocaleLowerCase().includes(query),
    );
  }, [data.members, searchQuery]);

  function selectMember(memberId: string) {
    draft.setMemberId(memberId);

    if (isChangingMember) {
      router.back();

      return;
    }

    router.replace("/(modals)/debt/new");
  }

  return (
    <>
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
