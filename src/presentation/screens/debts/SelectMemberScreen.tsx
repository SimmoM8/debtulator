import { Host, List, ListItem } from "@expo/ui";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { colors } from "@/src/theme";

export function SelectMemberScreen() {
  const data = useAppData();

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
    router.push({
      pathname: "/(modals)/debt/new",
      params: {
        memberId,
      },
    });
  }

  function close() {
    router.dismiss();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Select Member",
        }}
      />

      <Stack.SearchBar
        placeholder="Search Members"
        onChangeText={(event) => {
          setSearchQuery(event.nativeEvent.text ?? "");
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Close"
          onPress={close}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.plus}
          accessibilityLabel="Add member"
          onPress={() => {
            // Add Member flow comes later.
          }}
        />
      </Stack.Toolbar>

      <Host style={styles.root}>
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
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
});
