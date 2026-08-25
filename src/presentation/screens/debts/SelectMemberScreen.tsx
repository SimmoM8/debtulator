import { Host, List, ListItem } from "@expo/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { useNewDebtDraft } from "@/src/presentation/providers/NewDebtDraftProvider";
import { colors } from "@/src/theme";

export function SelectMemberScreen() {
  const data = useAppData();
  const draft = useNewDebtDraft();

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
    /*
     * This is now the ONLY state we mutate.
     *
     * Every other New Debt field remains untouched.
     */
    draft.setMemberId(memberId);

    if (isChangingMember) {
      /*
       * NewDebtScreen is still mounted underneath.
       *
       * Just pop Select Member.
       */
      router.back();

      return;
    }

    /*
     * Initial member selection.
     *
     * Replace the selection screen with the actual form.
     */
    router.replace("/(modals)/debt/new");
  }

  function close() {
    /*
     * Initial selection was cancelled.
     * Clear any draft state before dismissing the flow.
     */
    draft.reset();

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
