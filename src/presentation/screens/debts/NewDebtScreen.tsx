import { Text } from "@expo/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { toolbarIcons } from "@/src/navigation/toolbarIcons";
import { useAppData } from "@/src/presentation/providers/AppDataProvider";
import { colors } from "@/src/theme";

export function NewDebtScreen() {
  const data = useAppData();

  const { memberId } = useLocalSearchParams<{
    memberId?: string;
  }>();

  const selectedMember = useMemo(
    () => data.members.find((member) => member.id === memberId) ?? null,
    [data.members, memberId],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "New Debt",
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.close}
          accessibilityLabel="Close"
          onPress={() => {
            router.dismiss();
          }}
        />
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button accessibilityLabel="Create debt" disabled>
          Create
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <View style={styles.root}>
        {selectedMember && <Text>{selectedMember.displayName}</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
});
