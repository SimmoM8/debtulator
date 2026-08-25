import { Host, List, ListItem } from "@expo/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { colors } from "@/src/theme";

export function SelectMemberScreen() {
  const data = useAppData();

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
    const destination = {
      pathname: "/(modals)/debt/new" as const,
      params: {
        memberId,
      },
    };

    if (isChangingMember) {
      /*
       * New Debt is already underneath this screen.
       *
       * navigate() unwinds to the existing route rather than creating
       * another New Debt screen, preserving the existing form instance.
       */
      router.navigate(destination);

      return;
    }

    /*
     * Initial flow:
     *
     * Replace Select Member with New Debt. NewDebtScreen has
     * animationTypeForReplace="pop", giving the native reverse transition.
     */
    router.replace(destination);
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

      <Host
        seedColor={colors.nativeControlTint}
        useViewportSizeMeasurement
        style={styles.root}
      >
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
