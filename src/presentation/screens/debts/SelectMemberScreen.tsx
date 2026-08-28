import { List, ListItem } from "@expo/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { useCoreData } from "@/src/presentation/providers/CoreDataProvider";
import { useNewDebtDraft } from "@/src/presentation/providers/NewDebtDraftProvider";
import { NativeThemeHost, useAppTheme } from "@/src/theme";

export function SelectMemberScreen() {
  const data = useCoreData();
  const draft = useNewDebtDraft();
  const theme = useAppTheme();

  const { from } = useLocalSearchParams<{
    from?: string;
  }>();

  const isChangingMember = from === "new-debt";

  function close() {
    draft.reset();
    router.dismiss();
  }

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
